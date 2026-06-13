<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Activity;
use App\Entity\Category;
use App\Entity\ForumThread;
use App\Entity\User;
use App\Gamification\GamificationEvent;
use App\Gamification\GamificationService;
use App\Repository\ActivityGroupRepository;
use App\Repository\ActivityRepository;
use App\Repository\CategoryRepository;
use App\Repository\ForumThreadRepository;
use App\Service\CommentContentSanitizer;
use App\Service\ForumModerationService;
use App\Service\GroupService;
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

#[Route('/api/forum/threads')]
final class ForumThreadController extends AbstractController
{
    private const PER_PAGE = 20;

    public function __construct(
        private readonly Security $security,
        private readonly ForumThreadRepository $threadRepository,
        private readonly ActivityRepository $activityRepository,
        private readonly CategoryRepository $categoryRepository,
        private readonly ActivityGroupRepository $groupRepository,
        private readonly ForumModerationService $moderationService,
        private readonly GroupService $groupService,
        private readonly SocialSerializer $serializer,
        private readonly CommentContentSanitizer $sanitizer,
        private readonly ValidatorInterface $validator,
        private readonly UserActionThrottleService $throttle,
        private readonly EntityManagerInterface $em,
        private readonly GamificationService $gamificationService,
        private readonly LoggerInterface $logger,
    ) {
    }

    #[Route('', name: 'api_forum_threads_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $page = max(1, (int) $request->query->get('page', 1));

        $activity = $this->resolveActivity($request);
        $category = $this->resolveCategory($request);
        $group = $this->resolveGroup($request);

        $items = $this->threadRepository->findPaginated($page, self::PER_PAGE, $activity, $category, $group);
        $visible = array_filter($items, fn (ForumThread $t) => $this->moderationService->canAccess($user, $t));

        return $this->json([
            'member' => array_map(fn (ForumThread $t) => $this->serializer->threadToArray($t), array_values($visible)),
            'totalItems' => $this->threadRepository->countFiltered($activity, $category, $group),
            'page' => $page,
            'itemsPerPage' => self::PER_PAGE,
        ]);
    }

    #[Route('/{id}', name: 'api_forum_threads_show', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $thread = $this->threadRepository->find($id);
        if (!$thread instanceof ForumThread) {
            return $this->json(['message' => 'Fil introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if (!$this->moderationService->canAccess($user, $thread)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        return $this->json(['thread' => $this->serializer->threadToArray($thread)]);
    }

    #[Route('', name: 'api_forum_threads_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->requireUser();

        if ($user->isForumBanned()) {
            return $this->json(['message' => 'Vous êtes banni du forum.'], Response::HTTP_FORBIDDEN);
        }

        try {
            $this->throttle->assertCanCreateForumThread((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->throttleResponse($e);
        }

        $data = $request->toArray();
        $title = $this->sanitizer->sanitize(mb_substr((string) ($data['title'] ?? ''), 0, 200));
        $content = $this->sanitizer->sanitize((string) ($data['content'] ?? ''));

        $violations = $this->validator->validate($title, [new Assert\NotBlank(message: 'Le titre est obligatoire.')]);
        if (count($violations) > 0 || '' === trim($content)) {
            return $this->json(['message' => 'Titre et contenu requis.'], Response::HTTP_BAD_REQUEST);
        }

        $activityId = isset($data['activityId']) ? (int) $data['activityId'] : null;
        $categoryId = isset($data['categoryId']) ? (int) $data['categoryId'] : null;
        $groupId = isset($data['groupId']) ? (int) $data['groupId'] : null;

        if (null === $activityId && null === $categoryId && null === $groupId) {
            return $this->json(['message' => 'Cible requise (activité, catégorie ou groupe).'], Response::HTTP_BAD_REQUEST);
        }

        $thread = new ForumThread();
        $thread->setTitle($title);
        $thread->setContent($content);
        $thread->setAuthor($user);

        if (null !== $activityId) {
            $activity = $this->activityRepository->find($activityId);
            if (!$activity instanceof Activity) {
                return $this->json(['message' => 'Activité introuvable.'], Response::HTTP_NOT_FOUND);
            }
            $thread->setActivity($activity);
        }
        if (null !== $categoryId) {
            $category = $this->categoryRepository->find($categoryId);
            if (!$category instanceof Category) {
                return $this->json(['message' => 'Catégorie introuvable.'], Response::HTTP_NOT_FOUND);
            }
            $thread->setCategory($category);
        }
        if (null !== $groupId) {
            $group = $this->groupRepository->find($groupId);
            if (null === $group || ($group->isPrivate() && !$this->groupService->isMember($user, $group))) {
                return $this->json(['message' => 'Groupe introuvable ou accès refusé.'], Response::HTTP_FORBIDDEN);
            }
            $thread->setGroup($group);
        }

        $this->em->persist($thread);
        $this->em->flush();
        $this->throttle->markForumThreadCreated((int) $user->getId());
        $this->logger->info('forum.thread_created', ['threadId' => $thread->getId(), 'userId' => $user->getId()]);
        $badges = $this->gamificationService->evaluateAndAward($user, GamificationEvent::FORUM_THREAD_CREATED, []);

        return $this->json([
            'thread' => $this->serializer->threadToArray($thread),
            'unlockedBadges' => $badges,
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_forum_threads_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $thread = $this->threadRepository->find($id);
        if (!$thread instanceof ForumThread) {
            return $this->json(['message' => 'Fil introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $isAuthor = $thread->getAuthor()?->getId() === $user->getId();
        if (!$isAuthor && !$this->security->isGranted('ROLE_ADMIN')) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $this->em->remove($thread);
        $this->em->flush();

        return $this->json(['message' => 'Supprimé.']);
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

    private function resolveActivity(Request $request): ?Activity
    {
        $id = $request->query->get('activity');
        if (null === $id) {
            return null;
        }

        return $this->activityRepository->find((int) $id);
    }

    private function resolveCategory(Request $request): ?Category
    {
        $id = $request->query->get('category');
        if (null === $id) {
            return null;
        }

        return $this->categoryRepository->find((int) $id);
    }

    private function resolveGroup(Request $request): ?\App\Entity\ActivityGroup
    {
        $id = $request->query->get('group');
        if (null === $id) {
            return null;
        }

        return $this->groupRepository->find((int) $id);
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
