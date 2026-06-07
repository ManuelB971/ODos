<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Repository\AppThemeRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

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
                ],
                $themes,
            )
        );
    }
}
