<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\Repository\ActivityRepository;
use App\Service\BadgeDescriptionSanitizer;
use App\State\RecommendationStateProvider;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Serializer\Annotation\Groups;

#[ORM\Entity(repositoryClass: ActivityRepository::class)]
#[ApiResource(
    normalizationContext: ['groups' => ['activity:read']],
    denormalizationContext: ['groups' => ['activity:write']]
)]
#[ApiResource(
    uriTemplate: '/recommendations',
    operations: [
        new GetCollection(
            security: "is_granted('ROLE_USER')",
            securityMessage: 'Vous devez être connecté pour voir les recommandations.',
        )
    ],
    provider: RecommendationStateProvider::class,
    normalizationContext: ['groups' => ['activity:read']]
)]
class Activity
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['activity:read'])]
    private int $id;

    #[ORM\Column(length: 255)]
    #[Groups(['activity:read', 'activity:write'])]
    private ?string $name = null;

    #[ORM\Column(type: Types::TEXT)]
    #[Groups(['activity:read', 'activity:write'])]
    private ?string $description = null;

    #[ORM\Column]
    #[Groups(['activity:read', 'activity:write'])]
    private ?float $latitude = null;

    #[ORM\Column]
    #[Groups(['activity:read', 'activity:write'])]
    private ?float $longitude = null;

    #[ORM\Column(length: 255, nullable: true)]
    #[Groups(['activity:read', 'activity:write'])]
    private ?string $city = null;

    #[ORM\ManyToOne(inversedBy: 'activities')]
    #[ORM\JoinColumn(nullable: false)]
    #[Groups(['activity:read', 'activity:write'])]
    private ?Category $category = null;

    #[ORM\Column(nullable: true)]
    #[Groups(['activity:read', 'activity:write'])]
    private ?float $price = null;

    #[ORM\Column(length: 512, nullable: true)]
    #[Groups(['activity:read', 'activity:write'])]
    private ?string $imageUrl = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['activity:read', 'activity:write'])]
    private ?\DateTimeInterface $dateStart = null;

    #[ORM\Column(type: Types::DATETIME_MUTABLE, nullable: true)]
    #[Groups(['activity:read', 'activity:write'])]
    private ?\DateTimeInterface $dateEnd = null;

    #[ORM\Column(options: ['default' => true])]
    #[Groups(['activity:read', 'activity:write'])]
    private bool $isPublished = true;

    /**
     * @var Collection<int, User>
     */
    #[ORM\ManyToMany(targetEntity: User::class, mappedBy: 'favorites')]
    private Collection $favoritedBy;

    /**
     * @var Collection<int, User>
     */
    #[ORM\ManyToMany(targetEntity: User::class, mappedBy: 'visitedActivities')]
    private Collection $visitedBy;

    #[ORM\Column(type: Types::DECIMAL, precision: 4, scale: 2, nullable: true)]
    #[Groups(['activity:read'])]
    private ?string $ratingAverage = null;

    #[ORM\Column(options: ['default' => 0])]
    #[Groups(['activity:read'])]
    private int $ratingCount = 0;

    /**
     * @var Collection<int, Comment>
     */
    #[ORM\OneToMany(targetEntity: Comment::class, mappedBy: 'activity', orphanRemoval: true)]
    private Collection $comments;

    /**
     * @var Collection<int, ActivityRating>
     */
    #[ORM\OneToMany(targetEntity: ActivityRating::class, mappedBy: 'activity', orphanRemoval: true)]
    private Collection $ratings;

    public function __construct()
    {
        $this->favoritedBy = new ArrayCollection();
        $this->visitedBy = new ArrayCollection();
        $this->comments = new ArrayCollection();
        $this->ratings = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return isset($this->id) ? $this->id : null;
    }

    public function getName(): ?string
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
        if (null === $this->description || '' === $this->description) {
            return $this->description;
        }

        return (new BadgeDescriptionSanitizer())->toPlainText($this->description);
    }

    public function setDescription(string $description): static
    {
        $this->description = (new BadgeDescriptionSanitizer())->toPlainText($description);

        return $this;
    }

    public function getLatitude(): ?float
    {
        return $this->latitude;
    }

    public function setLatitude(float $latitude): static
    {
        $this->latitude = $latitude;

        return $this;
    }

    public function getLongitude(): ?float
    {
        return $this->longitude;
    }

    public function setLongitude(float $longitude): static
    {
        $this->longitude = $longitude;

        return $this;
    }

    public function getCity(): ?string
    {
        return $this->city;
    }

    public function setCity(?string $city): static
    {
        // Normalisation à l'écriture : on évite les doublons de villes liés aux
        // espaces parasites (« Paris » vs « Paris ») dans le catalogue et les filtres.
        $clean = null === $city ? null : trim($city);
        $this->city = ('' === $clean) ? null : $clean;

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

    public function getPrice(): ?float
    {
        return $this->price;
    }

    public function setPrice(?float $price): static
    {
        $this->price = $price;

        return $this;
    }

    public function getImageUrl(): ?string
    {
        return $this->imageUrl;
    }

    public function setImageUrl(?string $imageUrl): static
    {
        $this->imageUrl = $imageUrl;

        return $this;
    }

    public function getDateStart(): ?\DateTimeInterface
    {
        return $this->dateStart;
    }

    public function setDateStart(?\DateTimeInterface $dateStart): static
    {
        $this->dateStart = $dateStart;

        return $this;
    }

    public function getDateEnd(): ?\DateTimeInterface
    {
        return $this->dateEnd;
    }

    public function setDateEnd(?\DateTimeInterface $dateEnd): static
    {
        $this->dateEnd = $dateEnd;

        return $this;
    }

    public function isPublished(): bool
    {
        return $this->isPublished;
    }

    public function setIsPublished(bool $isPublished): static
    {
        $this->isPublished = $isPublished;

        return $this;
    }

    /**
     * @return Collection<int, User>
     */
    public function getFavoritedBy(): Collection
    {
        return $this->favoritedBy;
    }

    /**
     * @return Collection<int, User>
     */
    public function getVisitedBy(): Collection
    {
        return $this->visitedBy;
    }

    public function getRatingAverage(): ?float
    {
        return null !== $this->ratingAverage ? (float) $this->ratingAverage : null;
    }

    public function setRatingAverage(?float $ratingAverage): static
    {
        $this->ratingAverage = null !== $ratingAverage ? (string) round($ratingAverage, 2) : null;

        return $this;
    }

    public function getRatingCount(): int
    {
        return $this->ratingCount;
    }

    public function setRatingCount(int $ratingCount): static
    {
        $this->ratingCount = $ratingCount;

        return $this;
    }

    /**
     * @return Collection<int, Comment>
     */
    public function getComments(): Collection
    {
        return $this->comments;
    }

    /**
     * @return Collection<int, ActivityRating>
     */
    public function getRatings(): Collection
    {
        return $this->ratings;
    }
}
