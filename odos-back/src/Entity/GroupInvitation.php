<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\GroupInvitationStatus;
use App\Repository\GroupInvitationRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: GroupInvitationRepository::class)]
#[ORM\Table(name: 'group_invitation')]
#[ORM\UniqueConstraint(name: 'uniq_group_invitee_pending', columns: ['group_id', 'invitee_id'])]
#[ORM\Index(name: 'idx_invitation_invitee_status', columns: ['invitee_id', 'status'])]
class GroupInvitation
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private int $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?ActivityGroup $group = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $invitee = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $invitedBy = null;

    #[ORM\Column(length: 20, enumType: GroupInvitationStatus::class, options: ['default' => 'pending'])]
    private GroupInvitationStatus $status = GroupInvitationStatus::Pending;

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

    public function getGroup(): ?ActivityGroup
    {
        return $this->group;
    }

    public function setGroup(?ActivityGroup $group): static
    {
        $this->group = $group;

        return $this;
    }

    public function getInvitee(): ?User
    {
        return $this->invitee;
    }

    public function setInvitee(?User $invitee): static
    {
        $this->invitee = $invitee;

        return $this;
    }

    public function getInvitedBy(): ?User
    {
        return $this->invitedBy;
    }

    public function setInvitedBy(?User $invitedBy): static
    {
        $this->invitedBy = $invitedBy;

        return $this;
    }

    public function getStatus(): GroupInvitationStatus
    {
        return $this->status;
    }

    public function setStatus(GroupInvitationStatus $status): static
    {
        $this->status = $status;

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function setCreatedAt(\DateTimeImmutable $createdAt): static
    {
        $this->createdAt = $createdAt;

        return $this;
    }
}
