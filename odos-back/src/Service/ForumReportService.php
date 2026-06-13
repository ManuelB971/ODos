<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\ForumReply;
use App\Entity\ForumReport;
use App\Entity\ForumThread;
use App\Entity\User;
use App\Enum\ForumReportReason;
use App\Enum\ForumReportTargetType;
use App\Repository\ForumReportRepository;
use Doctrine\ORM\EntityManagerInterface;

final class ForumReportService
{
    public function __construct(
        private readonly ForumReportRepository $reportRepository,
        private readonly ForumModerationService $moderationService,
        private readonly CommentContentSanitizer $sanitizer,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public function reportThread(User $reporter, ForumThread $thread, ForumReportReason $reason, ?string $details): ForumReport
    {
        if (!$this->moderationService->canAccess($reporter, $thread)) {
            throw new \InvalidArgumentException('Contenu introuvable.');
        }

        return $this->createReport(
            $reporter,
            ForumReportTargetType::Thread,
            (int) $thread->getId(),
            $reason,
            $details,
            thread: $thread,
        );
    }

    public function reportReply(User $reporter, ForumReply $reply, ForumReportReason $reason, ?string $details): ForumReport
    {
        $thread = $reply->getThread();
        if (null === $thread || !$this->moderationService->canAccess($reporter, $thread)) {
            throw new \InvalidArgumentException('Contenu introuvable.');
        }

        return $this->createReport(
            $reporter,
            ForumReportTargetType::Reply,
            (int) $reply->getId(),
            $reason,
            $details,
            reply: $reply,
            thread: $thread,
        );
    }

    private function createReport(
        User $reporter,
        ForumReportTargetType $type,
        int $targetId,
        ForumReportReason $reason,
        ?string $details,
        ?ForumThread $thread = null,
        ?ForumReply $reply = null,
    ): ForumReport {
        $existing = $this->reportRepository->findExisting($reporter, $type, $targetId);
        if (null !== $existing) {
            return $existing;
        }

        $report = new ForumReport();
        $report->setReporter($reporter);
        $report->setTargetType($type);
        $report->setTargetId($targetId);
        $report->setReason($reason);
        $report->setDetails(null !== $details && '' !== trim($details)
            ? $this->sanitizer->sanitize(mb_substr($details, 0, 500))
            : null);
        $report->setThread($thread);
        $report->setReply($reply);

        $this->em->persist($report);
        $this->em->flush();

        return $report;
    }
}
