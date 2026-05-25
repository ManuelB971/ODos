<?php

declare(strict_types=1);

namespace App\Gamification;

use App\Entity\BadgeDefinition;
use App\Entity\User;
use App\Enum\BadgeRuleType;

final class BadgeRuleEvaluator
{
    public function __construct(
        private readonly GamificationStatsProvider $statsProvider,
    ) {
    }

    public function isSatisfied(BadgeDefinition $badge, User $user, GamificationStats $stats): bool
    {
        $config = $badge->getRuleConfig() ?? [];
        $threshold = max(1, (int) ($config['threshold'] ?? 1));

        return match ($badge->getRuleType()) {
            BadgeRuleType::Manual, BadgeRuleType::Custom => false,
            BadgeRuleType::MapCells => $stats->mapExplorationPercent >= (float) ($config['threshold'] ?? $config['percent'] ?? 25),
            BadgeRuleType::ActivityViews => $stats->activityViewsCount >= $threshold,
            BadgeRuleType::FavoritesCount => $stats->favoritesCount >= $threshold,
            BadgeRuleType::CommentsCount => $stats->commentsCount >= $threshold,
            BadgeRuleType::RatingsCount => $stats->ratingsCount >= $threshold,
            BadgeRuleType::CategoryExplorer => $this->evaluateCategoryExplorer($user, $config, $threshold),
        };
    }

    /**
     * @param array<string, mixed> $config
     */
    private function evaluateCategoryExplorer(User $user, array $config, int $threshold): bool
    {
        $categoryId = (int) ($config['categoryId'] ?? 0);
        if ($categoryId <= 0) {
            return false;
        }

        return $this->statsProvider->activityViewsInCategory($user, $categoryId) >= $threshold;
    }
}
