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
    public const FORUM_THREAD_CREATED = 'forum_thread_created';
    public const FORUM_REPLY_CREATED = 'forum_reply_created';
    public const FRIEND_REQUEST_SENT = 'friend_request_sent';
    public const FRIEND_ACCEPTED = 'friend_accepted';
    public const GROUP_JOINED = 'group_joined';
    public const ACTIVITY_SHARED = 'activity_shared';

    /** @return list<string> */
    public static function all(): array
    {
        return [
            self::ACTIVITY_VIEWED,
            self::FAVORITE_ADDED,
            self::COMMENT_CREATED,
            self::RATING_CREATED,
            self::FORUM_THREAD_CREATED,
            self::FORUM_REPLY_CREATED,
            self::FRIEND_REQUEST_SENT,
            self::FRIEND_ACCEPTED,
            self::GROUP_JOINED,
            self::ACTIVITY_SHARED,
        ];
    }
}
