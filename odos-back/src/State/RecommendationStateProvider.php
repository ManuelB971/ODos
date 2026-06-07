<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Activity;
use App\Entity\User;
use App\Recommendation\RecommendationEngineInterface;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Adaptateur API Platform pour l'endpoint GET /api/recommendations.
 *
 * Ne contient AUCUNE logique d'algorithme : il résout l'utilisateur courant et
 * délègue tout le calcul au moteur câblé pour {@see RecommendationEngineInterface}.
 * Changer / A-B tester l'algo = changer l'implémentation dans config/services.yaml,
 * sans toucher à cette classe.
 *
 * @implements ProviderInterface<Activity>
 */
final class RecommendationStateProvider implements ProviderInterface
{
    public function __construct(
        private readonly Security $security,
        private readonly RecommendationEngineInterface $engine,
    ) {}

    /** @return array<Activity> */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): array
    {
        $user = $this->security->getUser();

        if (!$user instanceof User) {
            return [];
        }

        return $this->engine->recommend($user);
    }
}
