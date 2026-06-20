<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\ContentReportTargetType;
use App\Enum\ForumReportReason;
use App\Enum\ForumReportStatus;
use App\Repository\ContentReportRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Signalement de contenu hors forum (message privé / message de groupe /
 * commentaire / profil). Calqué sur {@see ForumReport} : couple générique
 * `targetType` + `targetId` (dédup) + FK eager nullable pour l'affichage admin.
 * Réutilise les enums {@see ForumReportReason} / {@see ForumReportStatus}.
 */
#[ORM\Entity(repositoryClass: ContentReportRepository::class)]
#[ORM\Table(name: 'content_report')]
#[ORM\UniqueConstraint(name: 'uniq_content_report_reporter_target', columns: ['reporter_id', 'target_type', 'target_id'])]
#[ORM\Index(name: 'idx_content_report_status', columns: ['status', 'created_at'])]
class ContentReport
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private int $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $reporter = null;

    #[ORM\Column(length: 20, enumType: ContentReportTargetType::class)]
    private ContentReportTargetType $targetType;

    #[ORM\Column]
    private int $targetId;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?ChatMessage $chatMessage = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?GroupMessage $groupMessage = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Comment $comment = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $reportedUser = null;

    #[ORM\Column(length: 20, enumType: ForumReportReason::class)]
    private ForumReportReason $reason;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $details = null;

    #[ORM\Column(length: 20, enumType: ForumReportStatus::class, options: ['default' => 'pending'])]
    private ForumReportStatus $status = ForumReportStatus::Pending;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return isset($this->id) ? $this->id : null;
    }

    public function getReporter(): ?User
    {
        return $this->reporter;
    }

    public function setReporter(?User $reporter): static
    {
        $this->reporter = $reporter;

        return $this;
    }

    public function getTargetType(): ContentReportTargetType
    {
        return $this->targetType;
    }

    public function setTargetType(ContentReportTargetType $targetType): static
    {
        $this->targetType = $targetType;

        return $this;
    }

    public function getTargetId(): int
    {
        return $this->targetId;
    }

    public function setTargetId(int $targetId): static
    {
        $this->targetId = $targetId;

        return $this;
    }

    public function getChatMessage(): ?ChatMessage
    {
        return $this->chatMessage;
    }

    public function setChatMessage(?ChatMessage $chatMessage): static
    {
        $this->chatMessage = $chatMessage;

        return $this;
    }

    public function getGroupMessage(): ?GroupMessage
    {
        return $this->groupMessage;
    }

    public function setGroupMessage(?GroupMessage $groupMessage): static
    {
        $this->groupMessage = $groupMessage;

        return $this;
    }

    public function getComment(): ?Comment
    {
        return $this->comment;
    }

    public function setComment(?Comment $comment): static
    {
        $this->comment = $comment;

        return $this;
    }

    public function getReportedUser(): ?User
    {
        return $this->reportedUser;
    }

    public function setReportedUser(?User $reportedUser): static
    {
        $this->reportedUser = $reportedUser;

        return $this;
    }

    public function getReason(): ForumReportReason
    {
        return $this->reason;
    }

    public function setReason(ForumReportReason $reason): static
    {
        $this->reason = $reason;

        return $this;
    }

    public function getDetails(): ?string
    {
        return $this->details;
    }

    public function setDetails(?string $details): static
    {
        $this->details = $details;

        return $this;
    }

    public function getStatus(): ForumReportStatus
    {
        return $this->status;
    }

    public function setStatus(ForumReportStatus $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
