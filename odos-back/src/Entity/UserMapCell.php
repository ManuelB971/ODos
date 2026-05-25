<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\UserMapCellRepository;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: UserMapCellRepository::class)]
#[ORM\Table(name: 'user_map_cell')]
#[ORM\UniqueConstraint(name: 'uniq_user_map_cell', columns: ['user_id', 'cell_id'])]
class UserMapCell
{
    public const ZONE_CATALOG_V1 = 'catalog-v1';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    /** Identifiant geohash (précision fixe, ex. 6 caractères). */
    #[ORM\Column(length: 16)]
    private string $cellId = '';

    #[ORM\Column(length: 32)]
    private string $zoneKey = self::ZONE_CATALOG_V1;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $firstVisitedAt;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $lastVisitedAt;

    public function __construct()
    {
        $now = new \DateTimeImmutable();
        $this->firstVisitedAt = $now;
        $this->lastVisitedAt = $now;
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

    public function getCellId(): string
    {
        return $this->cellId;
    }

    public function setCellId(string $cellId): static
    {
        $this->cellId = $cellId;

        return $this;
    }

    public function getZoneKey(): string
    {
        return $this->zoneKey;
    }

    public function setZoneKey(string $zoneKey): static
    {
        $this->zoneKey = $zoneKey;

        return $this;
    }

    public function getFirstVisitedAt(): \DateTimeImmutable
    {
        return $this->firstVisitedAt;
    }

    public function getLastVisitedAt(): \DateTimeImmutable
    {
        return $this->lastVisitedAt;
    }

    public function touch(): static
    {
        $this->lastVisitedAt = new \DateTimeImmutable();

        return $this;
    }
}
