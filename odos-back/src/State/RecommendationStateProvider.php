<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Repository\ActivityRepository;
use App\Service\LlmRankingService;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Provides recommended activities based on the authenticated user's interests.
 *
 * Pipeline:
 * 1. DB candidates (category filter + isPublished)
 * 2. LLM re-ranking (if enabled) for smarter ordering
 * 3. Fallback to DB order if LLM is disabled or fails
 */
class RecommendationStateProvider implements ProviderInterface
{
    public function __construct(
        private ActivityRepository $activityRepository,
        private Security $security,
        private LlmRankingService $llmRankingService,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): array
    {
        $user = $this->security->getUser();

        if (!$user) {
            return [];
        }

        $interests = $user->getInterests();

        if ($interests->isEmpty()) {
            $candidates = $this->activityRepository->createQueryBuilder('a')
                ->where('a.isPublished = :pub')
                ->setParameter('pub', true)
                ->orderBy('a.id', 'DESC')
                ->getQuery()
                ->getResult();

            return $this->llmRankingService->rank([], $candidates);
        }

        $categoryIds = $interests->map(fn($category) => $category->getId())->toArray();
        $interestCategoryIds = $categoryIds;
        sort($interestCategoryIds);

        $userId = $user->getId();
        $cacheKey = $userId !== null
            ? hash('sha256', $userId . ':' . implode(',', $interestCategoryIds))
            : null;

        $interestNames = $interests->map(fn($category) => $category->getName())->toArray();

        $candidates = $this->activityRepository->createQueryBuilder('a')
            ->join('a.category', 'c')
            ->where('c.id IN (:categoryIds)')
            ->andWhere('a.isPublished = :pub')
            ->setParameter('categoryIds', $categoryIds)
            ->setParameter('pub', true)
            ->orderBy('a.id', 'DESC')
            ->getQuery()
            ->getResult();

        return $this->llmRankingService->rank($interestNames, $candidates, $cacheKey);
    }
}
