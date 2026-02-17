<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\GetCollection;
use App\Repository\ActivityRepository;
use App\State\RecommendationStateProvider;
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
    private ?int $id = null;

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

    public function getId(): ?int
    {
        return $this->id;
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
        return $this->description;
    }

    public function setDescription(string $description): static
    {
        $this->description = $description;

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
        $this->city = $city;

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
}
