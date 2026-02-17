<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use App\Repository\ActivityRepository;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * Provides recommended activities based on the authenticated user's interests.
 * 
 * Logic:
 * - Get the current user's interests (categories).
 * - Query activities whose category matches one of the user's interests.
 * - If the user has no interests, return all activities as a fallback.
 */
class RecommendationStateProvider implements ProviderInterface
{
    public function __construct(
        private ActivityRepository $activityRepository,
        private Security $security,
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): array
    {
        $user = $this->security->getUser();

        // Should not happen if security is configured, but just in case
        if (!$user) {
            return [];
        }

        $interests = $user->getInterests();

        // If the user has no interests, return all activities as fallback
        if ($interests->isEmpty()) {
            return $this->activityRepository->findAll();
        }

        // Get IDs of the user's interest categories
        $categoryIds = $interests->map(fn($category) => $category->getId())->toArray();

        // Query activities whose category is in the user's interests
        return $this->activityRepository->createQueryBuilder('a')
            ->join('a.category', 'c')
            ->where('c.id IN (:categoryIds)')
            ->setParameter('categoryIds', $categoryIds)
            ->orderBy('a.id', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
