<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Gamification\MapExplorationService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/me')]
final class MeExplorationController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly MapExplorationService $explorationService,
    ) {
    }

    #[Route('/exploration', name: 'api_me_exploration', methods: ['GET'])]
    public function getExploration(): JsonResponse
    {
        $user = $this->requireUser();
        $overview = $this->explorationService->buildOverview($user);
        $overview['visitedGeoJson'] = $this->explorationService->visitedCellsGeoJson($user);

        return $this->json($overview);
    }

    #[Route('/exploration/consent', name: 'api_me_exploration_consent', methods: ['POST'])]
    public function postConsent(): JsonResponse
    {
        $user = $this->requireUser();
        $this->explorationService->recordConsent($user);

        $overview = $this->explorationService->buildOverview($user);
        $overview['visitedGeoJson'] = $this->explorationService->visitedCellsGeoJson($user);

        return $this->json($overview);
    }

    #[Route('/exploration/settings', name: 'api_me_exploration_settings', methods: ['PATCH'])]
    public function patchSettings(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $data = $request->toArray();

        if (!array_key_exists('enabled', $data)) {
            return $this->json(['message' => 'Le champ enabled est requis.'], Response::HTTP_BAD_REQUEST);
        }

        $enabled = filter_var($data['enabled'], FILTER_VALIDATE_BOOL);
        $this->explorationService->setEnabled($user, $enabled);

        return $this->json($this->explorationService->buildOverview($user));
    }

    #[Route('/exploration/sync', name: 'api_me_exploration_sync', methods: ['POST'])]
    public function postSync(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $data = $request->toArray();
        $cells = $data['cells'] ?? $data['cellIds'] ?? [];

        if (!is_array($cells)) {
            return $this->json(['message' => 'Le champ cells doit être un tableau.'], Response::HTTP_BAD_REQUEST);
        }

        $cellIds = [];
        foreach ($cells as $cell) {
            if (is_string($cell)) {
                $cellIds[] = $cell;
            }
        }

        try {
            $result = $this->explorationService->syncCells($user, $cellIds);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_FORBIDDEN);
        }

        // buildOverview() n'inclut pas la géométrie (comme pour le GET) : on l'ajoute
        // ici, sinon le sync déclenché par le GPS renvoie un overview sans
        // visitedGeoJson, le cache front est écrasé et le calque orange disparaît
        // aussitôt. On renvoie la géométrie à jour (cellules fraîchement visitées
        // incluses) pour que l'overlay se mette à jour en direct.
        $result['overview']['visitedGeoJson'] = $this->explorationService->visitedCellsGeoJson($user);

        return $this->json($result);
    }

    private function requireUser(): User
    {
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        return $user;
    }
}
