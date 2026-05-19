<?php

namespace App\Controller;

use App\Entity\Activity;
use App\Entity\Comment;
use App\Entity\User;
use App\Repository\ActivityRepository;
use App\Repository\CommentRepository;
use App\Service\CommentContentSanitizer;
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

#[Route('/api/activities/{id}/comments')]
class ActivityCommentsController extends AbstractController
{
    private const PER_PAGE = 20;

    public function __construct(
        private ActivityRepository $activityRepository,
        private CommentRepository $commentRepository,
        private EntityManagerInterface $em,
        private Security $security,
        private CommentContentSanitizer $sanitizer,
        private ValidatorInterface $validator,
        private UserActionThrottleService $throttle,
        private LoggerInterface $logger,
    ) {}

    #[Route('', name: 'api_activity_comments_list', methods: ['GET'])]
    public function list(int $id, Request $request): JsonResponse
    {
        $activity = $this->findPublishedActivity($id);
        if (!$activity instanceof Activity) {
            return $this->json(['message' => 'Activité introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $page = max(1, (int) $request->query->get('page', 1));
        $isAdmin = $this->security->isGranted('ROLE_ADMIN');
        $items = $this->commentRepository->findVisibleForActivityPaginated($activity, $page, self::PER_PAGE, $isAdmin);
        $total = $this->commentRepository->countVisibleForActivity($activity, $isAdmin);

        $member = array_map(fn (Comment $c) => $this->serializeComment($c), $items);

        return $this->json([
            'member' => $member,
            'totalItems' => $total,
            'page' => $page,
            'itemsPerPage' => self::PER_PAGE,
        ]);
    }

    #[Route('', name: 'api_activity_comments_create', methods: ['POST'])]
    public function create(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        $activity = $this->findPublishedActivity($id);
        if (!$activity instanceof Activity) {
            return $this->json(['message' => 'Activité introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->throttle->assertCanPostComment((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->json(
                [
                    'message' => $e->getMessage(),
                    'retryAfterSeconds' => $e->getRetryAfterSeconds(),
                    'code' => 'RATE_LIMITED',
                ],
                Response::HTTP_TOO_MANY_REQUESTS,
                ['Retry-After' => (string) $e->getRetryAfterSeconds()]
            );
        }

        $data = json_decode($request->getContent(), true);
        $content = isset($data['content']) ? $this->sanitizer->sanitize((string) $data['content']) : '';

        $violations = $this->validator->validate($content, [
            new Assert\NotBlank(message: 'Le commentaire ne peut pas être vide.'),
            new Assert\Length(min: 2, max: 1000, minMessage: 'Minimum 2 caractères.', maxMessage: 'Maximum 1000 caractères.'),
        ]);
        if (\count($violations) > 0) {
            return $this->json(['message' => $violations[0]->getMessage()], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $comment = new Comment();
        $comment->setContent($content);
        $comment->setAuthor($user);
        $comment->setActivity($activity);

        $this->em->persist($comment);
        $this->em->flush();

        $this->throttle->markCommentPosted((int) $user->getId());
        $this->logger->info('comment.created', ['commentId' => $comment->getId(), 'activityId' => $activity->getId(), 'userId' => $user->getId()]);

        return $this->json($this->serializeComment($comment), Response::HTTP_CREATED);
    }

    private function findPublishedActivity(int $id): ?Activity
    {
        $activity = $this->activityRepository->find($id);
        if (!$activity instanceof Activity) {
            return null;
        }
        if (!$activity->isPublished() && !$this->security->isGranted('ROLE_ADMIN')) {
            return null;
        }

        return $activity;
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeComment(Comment $c): array
    {
        $author = $c->getAuthor();

        $payload = [
            'id' => $c->getId(),
            'content' => $c->getContent(),
            'createdAt' => $c->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'updatedAt' => $c->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
            'isEdited' => $c->isEdited(),
            'author' => $author instanceof User
                ? [
                    'id' => $author->getId(),
                    'displayName' => $author->getDisplayName(),
                ]
                : null,
            'activityId' => $c->getActivity()?->getId(),
        ];

        if ($this->security->isGranted('ROLE_ADMIN')) {
            $payload['isHidden'] = $c->isHidden();
        }

        return $payload;
    }
}
