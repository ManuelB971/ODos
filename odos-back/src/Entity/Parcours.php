<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\ParcoursVisibility;
use App\Repository\ParcoursRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Parcours = suite ordonnée d'activités (itinéraire), façon « liste Google Maps ».
 *
 * Construit par un propriétaire, partageable dans une conversation (les
 * destinataires deviennent collaborateurs et peuvent éditer), et visualisable
 * sur la carte. Les étapes sont des {@see ParcoursItem} (entité de jointure
 * ordonnée), suivant le style du projet : pas de Collection Doctrine, compteur
 * `itemCount` dénormalisé, accès via repository.
 */
#[ORM\Entity(repositoryClass: ParcoursRepository::class)]
#[ORM\Table(name: 'parcours')]
#[ORM\Index(name: 'idx_parcours_owner', columns: ['owner_id'])]
class Parcours
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private int $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?User $owner = null;

    #[ORM\Column(length: 120)]
    private string $title = '';

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $description = null;

    /**
     * Pochette personnalisée (façon playlist Spotify) ; `null` → repli sur l'image
     * de la première activité côté sérialiseur.
     */
    #[ORM\Column(length: 500, nullable: true)]
    private ?string $coverImageUrl = null;

    #[ORM\Column(length: 20, enumType: ParcoursVisibility::class, options: ['default' => 'private'])]
    private ParcoursVisibility $visibility = ParcoursVisibility::Private;

    #[ORM\Column(options: ['default' => 0])]
    private int $itemCount = 0;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $updatedAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return isset($this->id) ? $this->id : null;
    }

    public function getOwner(): ?User
    {
        return $this->owner;
    }

    public function setOwner(?User $owner): static
    {
        $this->owner = $owner;

        return $this;
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

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;

        return $this;
    }

    public function getCoverImageUrl(): ?string
    {
        return $this->coverImageUrl;
    }

    public function setCoverImageUrl(?string $coverImageUrl): static
    {
        $this->coverImageUrl = $coverImageUrl;

        return $this;
    }

    public function getVisibility(): ParcoursVisibility
    {
        return $this->visibility;
    }

    public function setVisibility(ParcoursVisibility $visibility): static
    {
        $this->visibility = $visibility;

        return $this;
    }

    public function getItemCount(): int
    {
        return $this->itemCount;
    }

    public function setItemCount(int $itemCount): static
    {
        $this->itemCount = max(0, $itemCount);

        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function touch(): static
    {
        $this->updatedAt = new \DateTimeImmutable();

        return $this;
    }
}
