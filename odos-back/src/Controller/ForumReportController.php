<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\ForumReply;
use App\Entity\ForumThread;
use App\Entity\User;
use App\Enum\ForumReportReason;
use App\Repository\ForumReplyRepository;
use App\Repository\ForumThreadRepository;
use App\Service\ForumReportService;
use App\Service\ThrottledActionException;
use App\Service\UserActionThrottleService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/forum')]
final class ForumReportController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly ForumThreadRepository $threadRepository,
        private readonly ForumReplyRepository $replyRepository,
        private readonly ForumReportService $reportService,
        private readonly UserActionThrottleService $throttle,
    ) {
    }

    #[Route('/threads/{id}/report', name: 'api_forum_threads_report', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function reportThread(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $thread = $this->threadRepository->find($id);
        if (!$thread instanceof ForumThread) {
            return $this->json(['message' => 'Fil introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->throttle->assertCanReportForumContent((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->throttleResponse($e);
        }

        $data = $request->toArray();
        $reason = ForumReportReason::tryFrom((string) ($data['reason'] ?? ''));
        if (null === $reason) {
            return $this->json(['message' => 'Motif invalide.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $report = $this->reportService->reportThread(
                $user,
                $thread,
                $reason,
                isset($data['details']) ? (string) $data['details'] : null,
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $this->throttle->markForumContentReported((int) $user->getId());

        return $this->json(['message' => 'Signalement enregistré.', 'reportId' => $report->getId()], Response::HTTP_CREATED);
    }

    #[Route('/replies/{id}/report', name: 'api_forum_replies_report', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function reportReply(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $reply = $this->replyRepository->find($id);
        if (!$reply instanceof ForumReply) {
            return $this->json(['message' => 'Réponse introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->throttle->assertCanReportForumContent((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->throttleResponse($e);
        }

        $data = $request->toArray();
        $reason = ForumReportReason::tryFrom((string) ($data['reason'] ?? ''));
        if (null === $reason) {
            return $this->json(['message' => 'Motif invalide.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $report = $this->reportService->reportReply(
                $user,
                $reply,
                $reason,
                isset($data['details']) ? (string) $data['details'] : null,
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $this->throttle->markForumContentReported((int) $user->getId());

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
