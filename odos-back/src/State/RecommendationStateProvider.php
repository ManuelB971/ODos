<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Entity\Activity;
use App\Entity\User;
use App\Recommendation\RecommendationEngineInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\RequestStack;

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
        private readonly RequestStack $requestStack,
    ) {}

    /** @return array<Activity> */
    public function provide(Operation $operation, array $uriVariables = [], array $context = []): array
    {
        $user = $this->security->getUser();

        if (!$user instanceof User) {
            return [];
        }

        $request = $this->requestStack->getCurrentRequest();
        $city = $request?->query->get('city');
        $cityParam = \is_string($city) && '' !== trim($city) ? trim($city) : null;

        return $this->engine->recommend($user, $cityParam);
    }
}
