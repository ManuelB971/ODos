<?php

declare(strict_types=1);

namespace App\Gamification;

/**
 * Événements métier déclenchant une réévaluation des badges.
 */
final class GamificationEvent
{
    public const ACTIVITY_VIEWED = 'activity_viewed';
    public const FAVORITE_ADDED = 'favorite_added';
    public const COMMENT_CREATED = 'comment_created';
    public const RATING_CREATED = 'rating_created';

    /** @return list<string> */
    public static function all(): array
    {
        return [
            self::ACTIVITY_VIEWED,
            self::FAVORITE_ADDED,
            self::COMMENT_CREATED,
            self::RATING_CREATED,
        ];
    }
}
