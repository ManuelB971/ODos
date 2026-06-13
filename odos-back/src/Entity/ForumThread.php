<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ForumThreadRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ForumThreadRepository::class)]
#[ORM\Table(name: 'forum_thread')]
#[ORM\Index(name: 'idx_thread_activity', columns: ['activity_id', 'created_at'])]
#[ORM\Index(name: 'idx_thread_category', columns: ['category_id', 'created_at'])]
#[ORM\Index(name: 'idx_thread_group', columns: ['group_id', 'created_at'])]
#[ORM\Index(name: 'idx_thread_global', columns: ['is_pinned', 'last_reply_at'])]
class ForumThread
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private int $id;

    #[ORM\Column(length: 200)]
    private string $title = '';

    #[ORM\Column(type: Types::TEXT)]
    private string $content = '';

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $author = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?Activity $activity = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?Category $category = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?ActivityGroup $group = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $isPinned = false;

    #[ORM\Column(options: ['default' => false])]
    private bool $isLocked = false;

    #[ORM\Column(options: ['default' => 0])]
    private int $replyCount = 0;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $lastReplyAt = null;

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

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;

        return $this;
    }

    public function getContent(): string
    {
        return $this->content;
    }

    public function setContent(string $content): static
    {
        $this->content = $content;

        return $this;
    }

    public function getAuthor(): ?User
    {
        return $this->author;
    }

    public function setAuthor(?User $author): static
    {
        $this->author = $author;

        return $this;
    }

    public function getActivity(): ?Activity
    {
        return $this->activity;
    }

    public function setActivity(?Activity $activity): static
    {
        $this->activity = $activity;

        return $this;
    }

    public function getCategory(): ?Category
    {
        return $this->category;
    }

    public function setCategory(?Category $category): static
    {
        $this->category = $category;

        return $this;
    }

    public function getGroup(): ?ActivityGroup
    {
        return $this->group;
    }

    public function setGroup(?ActivityGroup $group): static
    {
        $this->group = $group;

        return $this;
    }

    public function isPinned(): bool
    {
        return $this->isPinned;
    }

    public function setIsPinned(bool $isPinned): static
    {
        $this->isPinned = $isPinned;

        return $this;
    }

    public function isLocked(): bool
    {
        return $this->isLocked;
    }

    public function setIsLocked(bool $isLocked): static
    {
        $this->isLocked = $isLocked;

        return $this;
    }

    public function getReplyCount(): int
    {
        return $this->replyCount;
    }

    public function setReplyCount(int $replyCount): static
    {
        $this->replyCount = $replyCount;

        return $this;
    }

    public function incrementReplyCount(): void
    {
        ++$this->replyCount;
    }

    public function decrementReplyCount(): void
    {
        $this->replyCount = max(0, $this->replyCount - 1);
    }

    public function getLastReplyAt(): ?\DateTimeImmutable
    {
        return $this->lastReplyAt;
    }

    public function setLastReplyAt(?\DateTimeImmutable $lastReplyAt): static
    {
        $this->lastReplyAt = $lastReplyAt;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
