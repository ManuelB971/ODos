<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserBadgeDisplayRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: UserBadgeDisplayRepository::class)]
#[ORM\Table(name: 'user_badge_display')]
#[ORM\UniqueConstraint(name: 'uniq_user_badge_display', columns: ['user_id', 'badge_id'])]
class UserBadgeDisplay
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(inversedBy: 'badgeDisplays')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?BadgeDefinition $badge = null;

    #[ORM\Column(options: ['default' => true])]
    private bool $isDisplayedOnProfile = true;

    #[ORM\Column(nullable: true)]
    private ?int $displayOrder = null;

    public function getId(): ?int
    {
        return $this->id;
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

    public function getBadge(): ?BadgeDefinition
    {
        return $this->badge;
    }

    public function setBadge(?BadgeDefinition $badge): static
    {
        $this->badge = $badge;

        return $this;
    }

    public function isDisplayedOnProfile(): bool
    {
        return $this->isDisplayedOnProfile;
    }

    public function setIsDisplayedOnProfile(bool $isDisplayedOnProfile): static
    {
        $this->isDisplayedOnProfile = $isDisplayedOnProfile;

        return $this;
    }

    public function getDisplayOrder(): ?int
    {
        return $this->displayOrder;
    }

    public function setDisplayOrder(?int $displayOrder): static
    {
        $this->displayOrder = $displayOrder;

        return $this;
    }
}
