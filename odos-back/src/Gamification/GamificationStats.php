<?php

declare(strict_types=1);

namespace App\Gamification;

/**
 * Instantané des compteurs utilisés pour l'évaluation des règles de badges.
 */
final class GamificationStats
{
    public function __construct(
        public readonly int $activityViewsCount,
        public readonly int $favoritesCount,
        public readonly int $commentsCount,
        public readonly int $ratingsCount,
        public readonly float $mapExplorationPercent = 0.0,
        public readonly int $forumThreadsCount = 0,
        public readonly int $forumRepliesCount = 0,
        public readonly int $friendsCount = 0,
        public readonly int $groupsCount = 0,
        public readonly int $sharesCount = 0,
    ) {
    }
}
