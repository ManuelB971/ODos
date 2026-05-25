<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserActivityViewRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: UserActivityViewRepository::class)]
#[ORM\Table(name: 'user_activity_view')]
#[ORM\UniqueConstraint(name: 'uniq_user_activity_view', columns: ['user_id', 'activity_id'])]
class UserActivityView
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Activity $activity = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $firstViewedAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $lastViewedAt;

    public function __construct()
    {
        $now = new \DateTimeImmutable();
        $this->firstViewedAt = $now;
        $this->lastViewedAt = $now;
    }

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

    public function getActivity(): ?Activity
    {
        return $this->activity;
    }

    public function setActivity(?Activity $activity): static
    {
        $this->activity = $activity;

        return $this;
    }

    public function getFirstViewedAt(): \DateTimeImmutable
    {
        return $this->firstViewedAt;
    }

    public function getLastViewedAt(): \DateTimeImmutable
    {
        return $this->lastViewedAt;
    }

    public function touch(): static
    {
        $this->lastViewedAt = new \DateTimeImmutable();

        return $this;
    }
}
