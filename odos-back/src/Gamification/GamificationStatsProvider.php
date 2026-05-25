<?php

declare(strict_types=1);

namespace App\Gamification;

use App\Entity\User;
use App\Repository\CommentRepository;
use App\Repository\UserActivityViewRepository;
use App\Repository\UserMapCellRepository;
use App\Service\MapExplorationZoneRegistry;

final class GamificationStatsProvider
{
    public function __construct(
        private readonly UserActivityViewRepository $activityViewRepository,
        private readonly CommentRepository $commentRepository,
        private readonly UserMapCellRepository $mapCellRepository,
        private readonly MapExplorationZoneRegistry $zoneRegistry,
    ) {
    }

    public function forUser(User $user): GamificationStats
    {
        $percent = 0.0;
        if ($user->isMapExplorationActive()) {
            $zone = $this->zoneRegistry->getCatalogZone();
            $visited = $this->mapCellRepository->countForUserInZone($user, $zone['zoneKey']);
            $total = $zone['totalCells'];
            $percent = $total > 0 ? round(($visited / $total) * 100, 1) : 0.0;
        }

        return new GamificationStats(
            activityViewsCount: $this->activityViewRepository->countForUser($user),
            favoritesCount: $user->getFavorites()->count(),
            commentsCount: $this->commentRepository->countVisibleByAuthor($user),
            ratingsCount: $user->getActivityRatings()->count(),
            mapExplorationPercent: (float) $percent,
        );
    }

    public function activityViewsInCategory(User $user, int $categoryId): int
    {
        return $this->activityViewRepository->countForUserInCategory($user, $categoryId);
    }
}
