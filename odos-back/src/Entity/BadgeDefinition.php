<?php

declare(strict_types=1);

namespace App\Entity;

use App\Enum\BadgeRuleType;
use App\Repository\BadgeDefinitionRepository;
use App\Service\BadgeDescriptionSanitizer;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: BadgeDefinitionRepository::class)]
#[ORM\Table(name: 'badge_definition')]
#[ORM\HasLifecycleCallbacks]
#[UniqueEntity(fields: ['code'], message: 'Ce code badge existe déjà.')]
class BadgeDefinition
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 64, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 64)]
    #[Assert\Regex(pattern: '/^[a-z0-9_]+$/', message: 'Code : minuscules, chiffres et underscores uniquement.')]
    private ?string $code = null;

    #[ORM\Column(length: 120)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 120)]
    private ?string $name = null;

    #[ORM\Column(type: Types::TEXT)]
    #[Assert\NotBlank]
    #[Assert\Length(max: 2000)]
    private ?string $description = null;

    #[ORM\Column(length: 512, nullable: true)]
    private ?string $imageUrl = null;

    #[ORM\Column(options: ['default' => 0])]
    private int $sortOrder = 0;

    #[ORM\Column(options: ['default' => true])]
    private bool $isActive = true;

    /** Si true, le badge n'apparaît pas sur le profil tant que l'utilisateur ne l'active pas. */
    #[ORM\Column(options: ['default' => false])]
    private bool $isHiddenByDefault = false;

    #[ORM\Column(length: 32, enumType: BadgeRuleType::class)]
    private BadgeRuleType $ruleType = BadgeRuleType::Manual;

    /** @var array<string, mixed>|null */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $ruleConfig = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private ?\DateTimeImmutable $createdAt = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private ?\DateTimeImmutable $updatedAt = null;

    public function __construct()
    {
        $now = new \DateTimeImmutable();
        $this->createdAt = $now;
        $this->updatedAt = $now;
    }

    #[ORM\PreUpdate]
    public function onPreUpdate(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCode(): ?string
    {
        return $this->code;
    }

    public function setCode(string $code): static
    {
        $this->code = strtolower(trim($code));

        return $this;
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

    public function getImageUrl(): ?string
    {
        return $this->imageUrl;
    }

    public function setImageUrl(?string $imageUrl): static
    {
        $this->imageUrl = $imageUrl;

        return $this;
    }

    public function getSortOrder(): int
    {
        return $this->sortOrder;
    }

    public function setSortOrder(int $sortOrder): static
    {
        $this->sortOrder = $sortOrder;

        return $this;
    }

    public function isActive(): bool
    {
        return $this->isActive;
    }

    public function setIsActive(bool $isActive): static
    {
        $this->isActive = $isActive;

        return $this;
    }

    public function isHiddenByDefault(): bool
    {
        return $this->isHiddenByDefault;
    }

    public function setIsHiddenByDefault(bool $isHiddenByDefault): static
    {
        $this->isHiddenByDefault = $isHiddenByDefault;

        return $this;
    }

    public function getRuleType(): BadgeRuleType
    {
        return $this->ruleType;
    }

    public function setRuleType(BadgeRuleType $ruleType): static
    {
        $this->ruleType = $ruleType;

        return $this;
    }

    /**
     * @return array<string, mixed>|null
     */
    public function getRuleConfig(): ?array
    {
        return $this->ruleConfig;
    }

    /**
     * @param array<string, mixed>|null $ruleConfig
     */
    public function setRuleConfig(?array $ruleConfig): static
    {
        $this->ruleConfig = $ruleConfig;

        return $this;
    }

    public function getCreatedAt(): ?\DateTimeImmutable
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): ?\DateTimeImmutable
    {
        return $this->updatedAt;
    }

    public function __toString(): string
    {
        return $this->name ?? $this->code ?? 'Badge';
    }
}
