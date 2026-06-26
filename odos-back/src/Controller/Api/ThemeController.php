<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Entity\AppTheme;
use App\Repository\AppThemeRepository;
use App\Theme\PaletteSchema;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Contracts\Translation\TranslatorInterface;

class ThemeController extends AbstractController
{
    #[Route('/api/themes', name: 'api_themes_list', methods: ['GET'])]
    public function list(AppThemeRepository $themeRepo): JsonResponse
    {
        $themes = $themeRepo->findActive();

        return $this->json(
            array_map(
                static fn ($t) => [
                    'slug'        => $t->getSlug(),
                    'label'       => $t->getLabel(),
                    'description' => $t->getDescription(),
                    'light'       => $t->getLightPalette(),
                    'dark'        => $t->getDarkPalette(),
                ],
                $themes,
            )
        );
    }

    #[Route('/api/admin/themes/import', name: 'api_admin_themes_import', methods: ['POST'])]
    public function import(
        Request $request,
        AppThemeRepository $themeRepo,
        EntityManagerInterface $em,
        TranslatorInterface $translator,
    ): JsonResponse {
        $this->denyAccessUnlessGranted('ROLE_ADMIN');

        $payload = $request->toArray();
        $items = $this->extractThemesPayload($payload);
        if ([] === $items) {
            return $this->json(
                ['message' => $translator->trans('theme.import.payload_invalid')],
                Response::HTTP_BAD_REQUEST
            );
        }

        $imported = 0;
        foreach ($items as $row) {
            $slug = $this->normalizeString($row['slug'] ?? null);
            $label = $this->normalizeString($row['label'] ?? null);
            if (null === $slug || null === $label) {
                return $this->json(
                    ['message' => $translator->trans('theme.import.slug_label_required')],
                    Response::HTTP_BAD_REQUEST
                );
            }

            $light = $this->validatePalette($row['light'] ?? null, 'light', $translator);
            if ($light instanceof JsonResponse) {
                return $light;
            }

            $dark = $this->validatePalette($row['dark'] ?? null, 'dark', $translator);
            if ($dark instanceof JsonResponse) {
                return $dark;
            }

            $theme = $themeRepo->findOneBy(['slug' => $slug]);
            if (!$theme instanceof AppTheme) {
                $theme = new AppTheme();
                $theme->setSlug($slug);
                $em->persist($theme);
            }

            $theme
                ->setLabel($label)
                ->setDescription($this->normalizeString($row['description'] ?? null))
                ->setIsActive((bool) ($row['isActive'] ?? true))
                ->setSortOrder((int) ($row['sortOrder'] ?? 0))
                ->setLightPalette($light)
                ->setDarkPalette($dark);

            ++$imported;
        }

        $em->flush();

        return $this->json(['imported' => $imported], Response::HTTP_OK);
    }

    /**
     * @param array<string, mixed> $payload
     *
     * @return list<array<string, mixed>>
     */
    private function extractThemesPayload(array $payload): array
    {
        if (isset($payload['themes']) && \is_array($payload['themes'])) {
            /** @var list<array<string, mixed>> $themes */
            $themes = array_values(array_filter($payload['themes'], '\is_array'));
            return $themes;
        }

        /** @var list<array<string, mixed>> $rawThemes */
        $rawThemes = array_values(array_filter($payload, '\is_array'));
        return $rawThemes;
    }

    private function normalizeString(mixed $value): ?string
    {
        if (!\is_string($value)) {
            return null;
        }
        $trimmed = trim($value);

        return '' === $trimmed ? null : $trimmed;
    }

    /**
     * @return array<string, string>|JsonResponse|null palette normalisée, réponse d'erreur, ou null si absente
     */
    private function validatePalette(mixed $value, string $kind, TranslatorInterface $translator): array|JsonResponse|null
    {
        if (null === $value) {
            return null;
        }
        if (!\is_array($value)) {
            return $this->json(
                ['message' => $translator->trans('theme.import.palette_not_object', ['%kind%' => $kind])],
                Response::HTTP_BAD_REQUEST
            );
        }

        $missing = PaletteSchema::missingKeys($value);
        if ([] !== $missing) {
            return $this->json(
                ['message' => $translator->trans('theme.import.palette_missing_keys', [
                    '%kind%' => $kind,
                    '%keys%' => implode(', ', $missing),
                ])],
                Response::HTTP_BAD_REQUEST
            );
        }

        return PaletteSchema::normalize($value);
    }
}
