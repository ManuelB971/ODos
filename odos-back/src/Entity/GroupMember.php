<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\GroupRole;
use App\Repository\GroupMemberRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: GroupMemberRepository::class)]
#[ORM\Table(name: 'group_member')]
#[ORM\UniqueConstraint(name: 'uniq_group_member', columns: ['group_id', 'user_id'])]
#[ORM\Index(name: 'idx_member_user', columns: ['user_id'])]
class GroupMember
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
    private ?User $user = null;

    #[ORM\Column(length: 20, enumType: GroupRole::class, options: ['default' => 'member'])]
    private GroupRole $role = GroupRole::Member;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $joinedAt;

    public function __construct()
    {
        $this->joinedAt = new \DateTimeImmutable();
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

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getRole(): GroupRole
    {
        return $this->role;
    }

    public function setRole(GroupRole $role): static
    {
        $this->role = $role;

        return $this;
    }

    public function getJoinedAt(): \DateTimeImmutable
    {
        return $this->joinedAt;
    }
}
