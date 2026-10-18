<?php

declare(strict_types=1);

namespace App\Controller\Api;

use App\Service\HealthChecker;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Sonde pour le déploiement (CI healthcheck) et la supervision (blackbox).
 * Publique : ne renvoie que l'état des dépendances, jamais de données métier
 * ni de message d'erreur. 503 dès qu'une dépendance est en échec.
 */
final class HealthController extends AbstractController
{
    public function __construct(private readonly HealthChecker $healthChecker)
    {
    }

    #[Route('/api/health', name: 'api_health', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        $checks = $this->healthChecker->check();
        $healthy = !\in_array('fail', $checks, true);

        $response = $this->json(
            ['status' => $healthy ? 'ok' : 'fail', 'checks' => $checks],
            $healthy ? Response::HTTP_OK : Response::HTTP_SERVICE_UNAVAILABLE,
        );
        $response->headers->set('Cache-Control', 'no-store');

        return $response;
    }
}
