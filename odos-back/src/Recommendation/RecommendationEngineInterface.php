<?php

declare(strict_types=1);

namespace App\Recommendation;

use App\Entity\Activity;
use App\Entity\User;

/**
 * Contrat d'un moteur de recommandation d'activités.
 *
 * Permet de remplacer / A-B tester la stratégie de recommandation sans toucher
 * à la couche API : {@see \App\State\RecommendationStateProvider} ne fait que
 * déléguer à l'implémentation câblée pour cette interface (voir config/services.yaml).
 */
interface RecommendationEngineInterface
{
    /**
     * Calcule les activités recommandées pour un utilisateur.
     *
     * @param string|null $city ville cible (query param) ; repli sur homeCity si null
     *
     * @return array<Activity> activités ordonnées, la plus pertinente en premier
     */
    public function recommend(User $user, ?string $city = null): array;
}
