<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\SharedActivityRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: SharedActivityRepository::class)]
#[ORM\Table(name: 'shared_activity')]
#[ORM\Index(name: 'idx_shared_receiver_seen', columns: ['receiver_id', 'seen_at'])]
#[ORM\Index(name: 'idx_shared_group', columns: ['group_id', 'created_at'])]
class SharedActivity
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private int $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $sender = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?User $receiver = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'CASCADE')]
    private ?ActivityGroup $group = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Activity $activity = null;

    #[ORM\Column(length: 280, nullable: true)]
    private ?string $message = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE, nullable: true)]
    private ?\DateTimeImmutable $seenAt = null;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return isset($this->id) ? $this->id : null;
    }

    public function getSender(): ?User
    {
        return $this->sender;
    }

    public function setSender(?User $sender): static
    {
        $this->sender = $sender;

        return $this;
    }

    public function getReceiver(): ?User
    {
        return $this->receiver;
    }

    public function setReceiver(?User $receiver): static
    {
        $this->receiver = $receiver;

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

    public function getActivity(): ?Activity
    {
        return $this->activity;
    }

    public function setActivity(?Activity $activity): static
    {
        $this->activity = $activity;

        return $this;
    }

    public function getMessage(): ?string
    {
        return $this->message;
    }

    public function setMessage(?string $message): static
    {
        $this->message = $message;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getSeenAt(): ?\DateTimeImmutable
    {
        return $this->seenAt;
    }

    public function setSeenAt(?\DateTimeImmutable $seenAt): static
    {
        $this->seenAt = $seenAt;

        return $this;
    }
}
