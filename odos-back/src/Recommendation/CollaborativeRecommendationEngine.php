<?php

declare(strict_types=1);

namespace App\Recommendation;

use App\Entity\Activity;
use App\Entity\User;
use App\Repository\ActivityRepository;
use App\Service\LlmRankingService;

/**
 * Moteur de recommandation par défaut d'ODOS.
 *
 * Pipeline :
 *  1. Signaux utilisateur : intérêts (catégories), favoris, visites.
 *  2. Candidats DB : activités publiées filtrées par intérêts, EXCLUANT les lieux
 *     déjà connus (favoris ∪ visites) — on recommande du nouveau.
 *  3. Collaborative filtering : on remonte en tête les activités co-engagées
 *     (favoris + visites croisés) par les utilisateurs au goût proche.
 *  4. Re-ranking LLM (si activé) pour un ordonnancement plus fin ; sinon l'ordre
 *     CF/DB sert de repli.
 *
 * Toute la *politique* (poids, exclusion, ordre) vit ici ; l'accès aux données
 * est délégué à {@see ActivityRepository}, le LLM à {@see LlmRankingService}.
 */
final class CollaborativeRecommendationEngine implements RecommendationEngineInterface
{
    public function __construct(
        private readonly ActivityRepository $activityRepository,
        private readonly LlmRankingService $llmRankingService,
        private readonly float $visitWeight = 2.0,
        private readonly float $favoriteWeight = 1.0,
        private readonly int $candidateLimit = 50,
    ) {}

    public function recommend(User $user, ?string $city = null): array
    {
        $resolvedCity = $this->resolveCity($user, $city);
        if (null === $resolvedCity) {
            return [];
        }

        // Lieux déjà connus (favoris + visites) : graine du goût ET filtre d'exclusion.
        $visitedIds = $this->collectIds($user->getVisitedActivities());
        $favoriteIds = $this->collectIds($user->getFavorites());
        $knownIds = array_values(array_unique([...$visitedIds, ...$favoriteIds]));

        $interests = $user->getInterests();
        $userId = $user->getId();

        /** @var array<int> $categoryIds */
        $categoryIds = array_values(array_filter(
            $interests->map(static fn ($category) => $category->getId())->toArray(),
            static fn ($id) => null !== $id,
        ));

        /** @var array<string> $interestNames */
        $interestNames = array_values($interests->map(static fn ($category) => $category->getName())->toArray());

        $candidates = $this->activityRepository->findRecommendationCandidates($categoryIds, $knownIds, $resolvedCity);
        $candidates = $this->boostCoEngaged($candidates, $userId, $knownIds);

        return $this->llmRankingService->rank(
            $interestNames,
            $candidates,
            $this->cacheKey($userId, $categoryIds, $knownIds, $resolvedCity),
        );
    }

    private function resolveCity(User $user, ?string $city): ?string
    {
        $candidate = null !== $city && '' !== trim($city) ? trim($city) : $user->getHomeCity();
        if (null === $candidate || '' === trim($candidate)) {
            return null;
        }

        return trim($candidate);
    }

    /**
     * Extrait les IDs non nuls d'une collection d'activités.
     *
     * @param iterable<Activity> $activities
     *
     * @return array<int>
     */
    private function collectIds(iterable $activities): array
    {
        $ids = [];
        foreach ($activities as $activity) {
            $id = $activity->getId();
            if (null !== $id) {
                $ids[] = $id;
            }
        }

        return $ids;
    }

    /**
     * Remonte en tête les candidats co-engagés par les utilisateurs au goût
     * proche (favoris + visites croisés), le reste suit dans l'ordre initial.
     *
     * @param array<Activity> $candidates
     * @param array<int>      $seedIds favoris ∪ visites de l'utilisateur
     *
     * @return array<Activity>
     */
    private function boostCoEngaged(array $candidates, ?int $userId, array $seedIds): array
    {
        if (null === $userId || [] === $seedIds || [] === $candidates) {
            return $candidates;
        }

        $coEngagedIds = $this->activityRepository->findCoEngagedActivityIds(
            $userId,
            $seedIds,
            $seedIds,
            $this->visitWeight,
            $this->favoriteWeight,
            $this->candidateLimit,
        );

        if ([] === $coEngagedIds) {
            return $candidates;
        }

        $byId = [];
        foreach ($candidates as $activity) {
            $id = $activity->getId();
            if (null !== $id) {
                $byId[$id] = $activity;
            }
        }

        $boosted = [];
        foreach ($coEngagedIds as $id) {
            if (isset($byId[$id])) {
                $boosted[] = $byId[$id];
                unset($byId[$id]);
            }
        }

        // Les candidats restants (non co-engagés) conservent leur ordre initial.
        foreach ($candidates as $activity) {
            $id = $activity->getId();
            if (null !== $id && isset($byId[$id])) {
                $boosted[] = $activity;
            }
        }

        return $boosted;
    }

    /**
     * Clé de cache LLM : dépend de l'utilisateur, de ses intérêts ET de ses lieux
     * connus (favoris + visites changent le signal de co-engagement, donc l'ordre).
     *
     * @param array<int> $categoryIds
     * @param array<int> $knownIds
     */
    private function cacheKey(?int $userId, array $categoryIds, array $knownIds, string $city): ?string
    {
        if (null === $userId) {
            return null;
        }

        $cats = $categoryIds;
        sort($cats);
        sort($knownIds);

        return hash(
            'sha256',
            $userId . ':' . implode(',', $cats) . ':k' . implode(',', $knownIds) . ':c' . $city,
        );
    }
}
