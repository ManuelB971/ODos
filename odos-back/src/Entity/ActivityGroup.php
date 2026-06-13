<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ActivityGroupRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ActivityGroupRepository::class)]
#[ORM\Table(name: 'activity_group')]
#[ORM\Index(name: 'idx_group_public', columns: ['is_private', 'member_count'])]
class ActivityGroup
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private int $id;

    #[ORM\Column(length: 100)]
    private string $name = '';

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $description = null;

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $avatarUrl = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $isPrivate = false;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $createdBy = null;

    #[ORM\Column(options: ['default' => 1])]
    private int $memberCount = 1;

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

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getAvatarUrl(): ?string
    {
        return $this->avatarUrl;
    }

    public function setAvatarUrl(?string $avatarUrl): static
    {
        $this->avatarUrl = $avatarUrl;

        return $this;
    }

    public function isPrivate(): bool
    {
        return $this->isPrivate;
    }

    public function setIsPrivate(bool $isPrivate): static
    {
        $this->isPrivate = $isPrivate;

        return $this;
    }

    public function getCreatedBy(): ?User
    {
        return $this->createdBy;
    }

    public function setCreatedBy(?User $createdBy): static
    {
        $this->createdBy = $createdBy;

        return $this;
    }

    public function getMemberCount(): int
    {
        return $this->memberCount;
    }

    public function setMemberCount(int $memberCount): static
    {
        $this->memberCount = $memberCount;

        return $this;
    }

    public function incrementMemberCount(): void
    {
        ++$this->memberCount;
    }

    public function decrementMemberCount(): void
    {
        $this->memberCount = max(0, $this->memberCount - 1);
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
