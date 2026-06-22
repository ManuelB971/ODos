<?php

declare(strict_types=1);

namespace App\Controller;

use App\Repository\ActivityRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
final class CityCatalogController extends AbstractController
{
    public function __construct(
        private readonly ActivityRepository $activityRepository,
    ) {
    }

    #[Route('/cities', name: 'api_cities', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');

        return $this->json([
            'cities' => $this->activityRepository->findDistinctPublishedCities(),
        ]);
    }
}
