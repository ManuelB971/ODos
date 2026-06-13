<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\ForumReply;
use App\Entity\ForumThread;
use App\Entity\User;
use App\Event\ForumReplyCreatedEvent;
use App\Event\ForumReplyDeletedEvent;
use App\Gamification\GamificationEvent;
use App\Gamification\GamificationService;
use App\Repository\ForumReplyLikeRepository;
use App\Repository\ForumReplyRepository;
use App\Repository\ForumThreadRepository;
use App\Service\CommentContentSanitizer;
use App\Service\ForumModerationService;
use App\Service\SocialSerializer;
use App\Service\ThrottledActionException;
use App\Service\UserActionThrottleService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

#[Route('/api/forum')]
final class ForumReplyController extends AbstractController
{
    private const PER_PAGE = 20;

    public function __construct(
        private readonly Security $security,
        private readonly ForumThreadRepository $threadRepository,
        private readonly ForumReplyRepository $replyRepository,
        private readonly ForumReplyLikeRepository $likeRepository,
        private readonly ForumModerationService $moderationService,
        private readonly SocialSerializer $serializer,
        private readonly CommentContentSanitizer $sanitizer,
        private readonly ValidatorInterface $validator,
        private readonly UserActionThrottleService $throttle,
        private readonly EntityManagerInterface $em,
        private readonly GamificationService $gamificationService,
        private readonly EventDispatcherInterface $eventDispatcher,
        private readonly LoggerInterface $logger,
    ) {
    }

    #[Route('/threads/{id}/replies', name: 'api_forum_replies_list', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function list(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $thread = $this->threadRepository->find($id);
        if (!$thread instanceof ForumThread || !$this->moderationService->canAccess($user, $thread)) {
            return $this->json(['message' => 'Fil introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $page = max(1, (int) $request->query->get('page', 1));
        $isAdmin = $this->security->isGranted('ROLE_ADMIN');
        $items = $this->replyRepository->findForThreadPaginated($thread, $page, self::PER_PAGE, $isAdmin);
        $likedIds = $this->likeRepository->findLikedReplyIds($user, $items);

        $member = array_map(
            fn (ForumReply $r) => $this->serializer->replyToArray($r, $user, isset($likedIds[$r->getId() ?? 0])),
            $items,
        );

        return $this->json([
            'member' => $member,
            'totalItems' => $this->replyRepository->countForThread($thread, $isAdmin),
            'page' => $page,
            'itemsPerPage' => self::PER_PAGE,
        ]);
    }

    #[Route('/threads/{id}/replies', name: 'api_forum_replies_create', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function create(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();

        if ($user->isForumBanned()) {
            return $this->json(['message' => 'Vous êtes banni du forum.'], Response::HTTP_FORBIDDEN);
        }

        $thread = $this->threadRepository->find($id);
        if (!$thread instanceof ForumThread || !$this->moderationService->canAccess($user, $thread)) {
            return $this->json(['message' => 'Fil introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if ($thread->isLocked()) {
            return $this->json(['message' => 'Ce fil est verrouillé.'], Response::HTTP_LOCKED);
        }

        try {
            $this->throttle->assertCanPostForumReply((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->throttleResponse($e);
        }

        $content = $this->sanitizer->sanitize((string) ($request->toArray()['content'] ?? ''));
        $violations = $this->validator->validate($content, [
            new Assert\NotBlank(message: 'Le contenu est obligatoire.'),
            new Assert\Length(min: 2, max: 2000),
        ]);
        if (count($violations) > 0) {
            return $this->json(['message' => 'Contenu invalide.'], Response::HTTP_BAD_REQUEST);
        }

        $reply = new ForumReply();
        $reply->setContent($content);
        $reply->setAuthor($user);
        $reply->setThread($thread);

        $this->em->persist($reply);
        $this->em->flush();
        $this->throttle->markForumReplyPosted((int) $user->getId());
        $this->eventDispatcher->dispatch(new ForumReplyCreatedEvent($reply));
        $this->logger->info('forum.reply_created', ['replyId' => $reply->getId()]);
        $badges = $this->gamificationService->evaluateAndAward($user, GamificationEvent::FORUM_REPLY_CREATED, []);

        return $this->json([
            'reply' => $this->serializer->replyToArray($reply, $user, false),
            'unlockedBadges' => $badges,
        ], Response::HTTP_CREATED);
    }

    #[Route('/replies/{id}', name: 'api_forum_replies_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $reply = $this->replyRepository->find($id);
        if (!$reply instanceof ForumReply) {
            return $this->json(['message' => 'Réponse introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $isAuthor = $reply->getAuthor()?->getId() === $user->getId();
        if (!$isAuthor && !$this->security->isGranted('ROLE_ADMIN')) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $this->eventDispatcher->dispatch(new ForumReplyDeletedEvent($reply));
        $this->em->remove($reply);
        $this->em->flush();

        return $this->json(['message' => 'Supprimé.']);
    }

    #[Route('/replies/{id}/like', name: 'api_forum_replies_like', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function like(int $id): JsonResponse
    {
        $user = $this->requireUser();

        try {
            $this->throttle->assertCanToggleForumLike((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->throttleResponse($e);
        }

        $reply = $this->replyRepository->find($id);
        if (!$reply instanceof ForumReply) {
            return $this->json(['message' => 'Réponse introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $thread = $reply->getThread();
        if (!$thread instanceof ForumThread || !$this->moderationService->canAccess($user, $thread)) {
            return $this->json(['message' => 'Réponse introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if ($reply->getAuthor()?->getId() === $user->getId()) {
            return $this->json(['message' => 'Vous ne pouvez pas liker votre propre réponse.'], Response::HTTP_BAD_REQUEST);
        }

        $existing = $this->likeRepository->findLike($user, $reply);
        if (null !== $existing) {
            return $this->json(['message' => 'Déjà liké.', 'liked' => true]);
        }

        $like = new \App\Entity\ForumReplyLike();
        $like->setUser($user);
        $like->setReply($reply);
        $this->em->persist($like);
        $this->em->flush();
        $this->throttle->markForumLikeToggled((int) $user->getId());
        $this->eventDispatcher->dispatch(new \App\Event\ForumReplyLikedEvent($reply));

        return $this->json(['liked' => true, 'likeCount' => $reply->getLikeCount() + 1]);
    }

    #[Route('/replies/{id}/like', name: 'api_forum_replies_unlike', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function unlike(int $id): JsonResponse
    {
        $user = $this->requireUser();

        try {
            $this->throttle->assertCanToggleForumLike((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->throttleResponse($e);
        }

        $reply = $this->replyRepository->find($id);
        if (!$reply instanceof ForumReply) {
            return $this->json(['message' => 'Réponse introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $thread = $reply->getThread();
        if (!$thread instanceof ForumThread || !$this->moderationService->canAccess($user, $thread)) {
            return $this->json(['message' => 'Réponse introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $existing = $this->likeRepository->findLike($user, $reply);
        if (null === $existing) {
            return $this->json(['liked' => false]);
        }

        $this->em->remove($existing);
        $this->em->flush();
        $this->throttle->markForumLikeToggled((int) $user->getId());
        $this->eventDispatcher->dispatch(new \App\Event\ForumReplyUnlikedEvent($reply));

        return $this->json(['liked' => false, 'likeCount' => max(0, $reply->getLikeCount() - 1)]);
    }

    private function requireUser(): User
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        return $user;
    }

    private function throttleResponse(ThrottledActionException $e): JsonResponse
    {
        return $this->json(
            ['message' => $e->getMessage(), 'retryAfterSeconds' => $e->getRetryAfterSeconds(), 'code' => 'RATE_LIMITED'],
            Response::HTTP_TOO_MANY_REQUESTS,
            ['Retry-After' => (string) $e->getRetryAfterSeconds()]
        );
    }
}
