<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\ForumReportReason;
use App\Enum\ForumReportStatus;
use App\Enum\ForumReportTargetType;
use App\Repository\ForumReportRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ForumReportRepository::class)]
#[ORM\Table(name: 'forum_report')]
#[ORM\UniqueConstraint(name: 'uniq_forum_report_reporter_target', columns: ['reporter_id', 'target_type', 'target_id'])]
#[ORM\Index(name: 'idx_forum_report_status', columns: ['status', 'created_at'])]
class ForumReport
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private int $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $reporter = null;

    #[ORM\Column(length: 10, enumType: ForumReportTargetType::class)]
    private ForumReportTargetType $targetType;

    #[ORM\Column]
    private int $targetId;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?ForumThread $thread = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?ForumReply $reply = null;

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

    public function getTargetType(): ForumReportTargetType
    {
        return $this->targetType;
    }

    public function setTargetType(ForumReportTargetType $targetType): static
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

    public function getThread(): ?ForumThread
    {
        return $this->thread;
    }

    public function setThread(?ForumThread $thread): static
    {
        $this->thread = $thread;

        return $this;
    }

    public function getReply(): ?ForumReply
    {
        return $this->reply;
    }

    public function setReply(?ForumReply $reply): static
    {
        $this->reply = $reply;

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
