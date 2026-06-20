<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\ChatMessage;
use App\Entity\Comment;
use App\Entity\ContentReport;
use App\Entity\GroupMessage;
use App\Entity\User;
use App\Enum\ForumReportReason;
use App\Repository\ChatMessageRepository;
use App\Repository\CommentRepository;
use App\Repository\GroupMessageRepository;
use App\Repository\UserRepository;
use App\Service\ContentReportService;
use App\Service\ThrottledActionException;
use App\Service\UserActionThrottleService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Signalement de contenu hors forum (modération UGC). Chaque route applique le
 * throttle commun, refuse le signalement de son propre contenu, et délègue la
 * persistance/dédup à {@see ContentReportService}.
 */
#[Route('/api')]
final class ContentReportController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly ChatMessageRepository $chatMessageRepository,
        private readonly GroupMessageRepository $groupMessageRepository,
        private readonly CommentRepository $commentRepository,
        private readonly UserRepository $userRepository,
        private readonly ContentReportService $reportService,
        private readonly UserActionThrottleService $throttle,
    ) {
    }

    #[Route('/chat-messages/{id}/report', name: 'api_chat_message_report', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function reportChatMessage(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $message = $this->chatMessageRepository->find($id);
        if (!$message instanceof ChatMessage) {
            return $this->json(['message' => 'Message introuvable.'], Response::HTTP_NOT_FOUND);
        }
        if ($message->getAuthor()?->getId() === $user->getId()) {
            return $this->json(['message' => 'Vous ne pouvez pas signaler votre propre message.'], Response::HTTP_BAD_REQUEST);
        }

        return $this->handle($user, $request, fn (ForumReportReason $reason, ?string $details): ContentReport => $this->reportService->reportChatMessage($user, $message, $reason, $details));
    }

    #[Route('/group-messages/{id}/report', name: 'api_group_message_report', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function reportGroupMessage(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $message = $this->groupMessageRepository->find($id);
        if (!$message instanceof GroupMessage) {
            return $this->json(['message' => 'Message introuvable.'], Response::HTTP_NOT_FOUND);
        }
        if ($message->getAuthor()?->getId() === $user->getId()) {
            return $this->json(['message' => 'Vous ne pouvez pas signaler votre propre message.'], Response::HTTP_BAD_REQUEST);
        }

        return $this->handle($user, $request, fn (ForumReportReason $reason, ?string $details): ContentReport => $this->reportService->reportGroupMessage($user, $message, $reason, $details));
    }

    #[Route('/comments/{id}/report', name: 'api_comment_report', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function reportComment(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $comment = $this->commentRepository->find($id);
        if (!$comment instanceof Comment) {
            return $this->json(['message' => 'Commentaire introuvable.'], Response::HTTP_NOT_FOUND);
        }
        if ($comment->getAuthor()?->getId() === $user->getId()) {
            return $this->json(['message' => 'Vous ne pouvez pas signaler votre propre commentaire.'], Response::HTTP_BAD_REQUEST);
        }

        return $this->handle($user, $request, fn (ForumReportReason $reason, ?string $details): ContentReport => $this->reportService->reportComment($user, $comment, $reason, $details));
    }

    #[Route('/users/{id}/report', name: 'api_user_report', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function reportUser(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $target = $this->userRepository->find($id);
        if (!$target instanceof User) {
            return $this->json(['message' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        return $this->handle($user, $request, fn (ForumReportReason $reason, ?string $details): ContentReport => $this->reportService->reportUser($user, $target, $reason, $details));
    }

    /**
     * @param callable(ForumReportReason, ?string): ContentReport $create
     */
    private function handle(User $user, Request $request, callable $create): JsonResponse
    {
        try {
            $this->throttle->assertCanReportContent((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->throttleResponse($e);
        }

        $data = $request->toArray();
        $reason = ForumReportReason::tryFrom((string) ($data['reason'] ?? ''));
        if (null === $reason) {
            return $this->json(['message' => 'Motif invalide.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $report = $create($reason, isset($data['details']) ? (string) $data['details'] : null);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $this->throttle->markContentReported((int) $user->getId());

        return $this->json(['message' => 'Signalement enregistré.', 'reportId' => $report->getId()], Response::HTTP_CREATED);
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
