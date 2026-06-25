<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\AppThemeRepository;
use App\Theme\PaletteSchema;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Context\ExecutionContextInterface;

#[ORM\Entity(repositoryClass: AppThemeRepository::class)]
#[ORM\Table(name: 'app_theme')]
class AppTheme
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    /** Clé correspondant à une palette bundlée dans l'app mobile (ex : "ocean", "forest"). */
    #[ORM\Column(length: 64, unique: true)]
    #[Assert\NotBlank]
    #[Assert\Regex(pattern: '/^[a-z0-9_-]+$/', message: 'Le slug ne peut contenir que des lettres minuscules, chiffres, tirets et underscores.')]
    private string $slug = '';

    #[ORM\Column(length: 128)]
    #[Assert\NotBlank]
    private string $label = '';

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $description = null;

    #[ORM\Column]
    private bool $isActive = true;

    #[ORM\Column]
    private int $sortOrder = 0;

    /**
     * Palette light complète (mêmes clés que `OdosColorPalette` côté mobile).
     *
     * @var array<string, string>|null
     */
    #[ORM\Column(type: 'json', nullable: true)]
    #[Assert\Type('array')]
    private ?array $lightPalette = null;

    /**
     * Palette dark complète (mêmes clés que `OdosColorPalette` côté mobile).
     *
     * @var array<string, string>|null
     */
    #[ORM\Column(type: 'json', nullable: true)]
    #[Assert\Type('array')]
    private ?array $darkPalette = null;

    /**
     * Erreurs de désérialisation JSON transitoires (non persistées), capturées
     * lors de l'édition admin pour être remontées en violation de formulaire
     * plutôt qu'en 500. Clé = chemin du champ ('lightPaletteJson'/'darkPaletteJson').
     *
     * @var array<string, string>
     */
    private array $paletteJsonErrors = [];

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getSlug(): string
    {
        return $this->slug;
    }

    public function setSlug(string $slug): static
    {
        $this->slug = $slug;
        return $this;
    }

    public function getLabel(): string
    {
        return $this->label;
    }

    public function setLabel(string $label): static
    {
        $this->label = $label;
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

    public function isActive(): bool
    {
        return $this->isActive;
    }

    public function setIsActive(bool $isActive): static
    {
        $this->isActive = $isActive;
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

    /**
     * @return array<string, string>|null
     */
    public function getLightPalette(): ?array
    {
        return $this->lightPalette;
    }

    /**
     * @param array<string, string>|null $lightPalette
     */
    public function setLightPalette(?array $lightPalette): static
    {
        $this->lightPalette = $lightPalette;
        return $this;
    }

    /**
     * @return array<string, string>|null
     */
    public function getDarkPalette(): ?array
    {
        return $this->darkPalette;
    }

    /**
     * @param array<string, string>|null $darkPalette
     */
    public function setDarkPalette(?array $darkPalette): static
    {
        $this->darkPalette = $darkPalette;
        return $this;
    }

    // ── Adaptateurs JSON pour l'édition admin (EasyAdmin CodeEditorField) ──────
    // Les colonnes sont de type `json` (donc `?array` en PHP), incompatibles avec
    // un champ texte. Ces accesseurs string font le pont sans jamais lever
    // d'exception : un JSON invalide est mémorisé puis remonté par validatePalettes().

    public function getLightPaletteJson(): ?string
    {
        return self::encodePaletteJson($this->lightPalette);
    }

    public function setLightPaletteJson(?string $json): static
    {
        [$this->lightPalette, $error] = self::decodePaletteJson($json);
        $this->setJsonError('lightPaletteJson', $error);

        return $this;
    }

    public function getDarkPaletteJson(): ?string
    {
        return self::encodePaletteJson($this->darkPalette);
    }

    public function setDarkPaletteJson(?string $json): static
    {
        [$this->darkPalette, $error] = self::decodePaletteJson($json);
        $this->setJsonError('darkPaletteJson', $error);

        return $this;
    }

    /**
     * Valide les palettes côté formulaire admin : JSON parsable ET complet
     * (toutes les clés `PaletteSchema`). Les violations sont attachées au champ
     * concerné pour un retour utilisateur propre, jamais un 500.
     */
    #[Assert\Callback]
    public function validatePalettes(ExecutionContextInterface $context): void
    {
        /** @var array<string, array<string, string>|null> $fields */
        $fields = [
            'lightPaletteJson' => $this->lightPalette,
            'darkPaletteJson' => $this->darkPalette,
        ];

        foreach ($fields as $path => $palette) {
            if (isset($this->paletteJsonErrors[$path])) {
                $context->buildViolation($this->paletteJsonErrors[$path])->atPath($path)->addViolation();
                continue;
            }

            if (null === $palette) {
                continue; // palette optionnelle : fallback sur le bundle mobile
            }

            $missing = PaletteSchema::missingKeys($palette);
            if ([] !== $missing) {
                $context
                    ->buildViolation('Palette incomplète — clés manquantes ou vides : {{ keys }}.')
                    ->setParameter('{{ keys }}', implode(', ', $missing))
                    ->atPath($path)
                    ->addViolation();
            }
        }
    }

    private function setJsonError(string $path, ?string $error): void
    {
        if (null === $error) {
            unset($this->paletteJsonErrors[$path]);

            return;
        }
        $this->paletteJsonErrors[$path] = $error;
    }

    /**
     * @param array<string, string>|null $palette
     */
    private static function encodePaletteJson(?array $palette): ?string
    {
        if (null === $palette) {
            return null;
        }

        $json = json_encode($palette, \JSON_PRETTY_PRINT | \JSON_UNESCAPED_SLASHES | \JSON_UNESCAPED_UNICODE);

        return false === $json ? null : $json;
    }

    /**
     * @return array{0: array<string, string>|null, 1: string|null} [palette, message d'erreur]
     */
    private static function decodePaletteJson(?string $json): array
    {
        if (null === $json || '' === trim($json)) {
            return [null, null];
        }

        try {
            /** @var mixed $decoded */
            $decoded = json_decode($json, true, 512, \JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            return [null, sprintf('JSON invalide : %s', $e->getMessage())];
        }

        if (!\is_array($decoded)) {
            return [null, 'La palette doit être un objet clé/valeur.'];
        }

        /** @var array<string, string> $decoded */
        return [$decoded, null];
    }

    public function __toString(): string
    {
        return $this->label;
    }
}
