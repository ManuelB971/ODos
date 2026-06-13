<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ForumReplyRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ForumReplyRepository::class)]
#[ORM\Table(name: 'forum_reply')]
#[ORM\Index(name: 'idx_reply_thread_date', columns: ['thread_id', 'created_at'])]
class ForumReply
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private int $id;

    #[ORM\Column(type: Types::TEXT)]
    private string $content = '';

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $author = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?ForumThread $thread = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $isHidden = false;

    #[ORM\Column(options: ['default' => 0])]
    private int $likeCount = 0;

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

    public function getThread(): ?ForumThread
    {
        return $this->thread;
    }

    public function setThread(?ForumThread $thread): static
    {
        $this->thread = $thread;

        return $this;
    }

    public function isHidden(): bool
    {
        return $this->isHidden;
    }

    public function setIsHidden(bool $isHidden): static
    {
        $this->isHidden = $isHidden;

        return $this;
    }

    public function getLikeCount(): int
    {
        return $this->likeCount;
    }

    public function setLikeCount(int $likeCount): static
    {
        $this->likeCount = $likeCount;

        return $this;
    }

    public function incrementLikeCount(): void
    {
        ++$this->likeCount;
    }

    public function decrementLikeCount(): void
    {
        $this->likeCount = max(0, $this->likeCount - 1);
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
