<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\ChatMessage;
use App\Entity\Comment;
use App\Entity\ContentReport;
use App\Entity\GroupMessage;
use App\Entity\User;
use App\Enum\ContentReportTargetType;
use App\Enum\ForumReportReason;
use App\Repository\ContentReportRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Signalement de contenu hors forum (message privé / groupe / commentaire /
 * profil). Pendant générique de {@see ForumReportService} : dédup par cible,
 * sanitation des détails, refus de l'auto-signalement de profil.
 */
final class ContentReportService
{
    private const DETAILS_MAX = 500;

    public function __construct(
        private readonly ContentReportRepository $reportRepository,
        private readonly CommentContentSanitizer $sanitizer,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public function reportChatMessage(User $reporter, ChatMessage $message, ForumReportReason $reason, ?string $details): ContentReport
    {
        return $this->createReport(
            $reporter,
            ContentReportTargetType::ChatMessage,
            (int) $message->getId(),
            $reason,
            $details,
            chatMessage: $message,
        );
    }

    public function reportGroupMessage(User $reporter, GroupMessage $message, ForumReportReason $reason, ?string $details): ContentReport
    {
        return $this->createReport(
            $reporter,
            ContentReportTargetType::GroupMessage,
            (int) $message->getId(),
            $reason,
            $details,
            groupMessage: $message,
        );
    }

    public function reportComment(User $reporter, Comment $comment, ForumReportReason $reason, ?string $details): ContentReport
    {
        return $this->createReport(
            $reporter,
            ContentReportTargetType::Comment,
            (int) $comment->getId(),
            $reason,
            $details,
            comment: $comment,
        );
    }

    public function reportUser(User $reporter, User $reported, ForumReportReason $reason, ?string $details): ContentReport
    {
        if ($reporter->getId() === $reported->getId()) {
            throw new \InvalidArgumentException('Vous ne pouvez pas vous signaler.');
        }

        return $this->createReport(
            $reporter,
            ContentReportTargetType::UserProfile,
            (int) $reported->getId(),
            $reason,
            $details,
            reportedUser: $reported,
        );
    }

    private function createReport(
        User $reporter,
        ContentReportTargetType $type,
        int $targetId,
        ForumReportReason $reason,
        ?string $details,
        ?ChatMessage $chatMessage = null,
        ?GroupMessage $groupMessage = null,
        ?Comment $comment = null,
        ?User $reportedUser = null,
    ): ContentReport {
        $existing = $this->reportRepository->findExisting($reporter, $type, $targetId);
        if (null !== $existing) {
            return $existing;
        }

        $report = new ContentReport();
        $report->setReporter($reporter);
        $report->setTargetType($type);
        $report->setTargetId($targetId);
        $report->setReason($reason);
        $report->setDetails(null !== $details && '' !== trim($details)
            ? $this->sanitizer->sanitize(mb_substr($details, 0, self::DETAILS_MAX))
            : null);
        $report->setChatMessage($chatMessage);
        $report->setGroupMessage($groupMessage);
        $report->setComment($comment);
        $report->setReportedUser($reportedUser);

        $this->em->persist($report);
        $this->em->flush();

        return $report;
    }
}
