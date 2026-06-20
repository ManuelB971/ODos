<?php

namespace App\Service;

use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

/**
 * Lightweight per-user throttling using the app cache (Redis in prod).
 *
 * En cas d'action trop rapprochée, lève {@see ThrottledActionException}
 * qui porte la durée d'attente restante (`retryAfterSeconds`).
 */
final class UserActionThrottleService
{
    public function __construct(
        private CacheInterface $cache,
    ) {}

    /**
     * @throws ThrottledActionException if called too soon after the previous successful action
     */
    public function assertCanPostComment(int $userId): void
    {
        $this->assertMinGapSinceLastSuccess(
            'comment_ok_'.$userId,
            5,
            'Trop de commentaires. Réessayez dans quelques secondes.'
        );
    }

    public function assertCanPutRating(int $userId): void
    {
        $this->assertMinGapSinceLastSuccess(
            'rating_ok_'.$userId,
            3,
            'Veuillez patienter quelques secondes entre deux actions sur les notes.'
        );
    }

    /**
     * Empêche un utilisateur de spammer l'upload d'avatar (2 MiB / requête → DoS potentiel).
     *
     * @throws ThrottledActionException
     */
    public function assertCanUploadAvatar(int $userId): void
    {
        $this->assertMinGapSinceLastSuccess(
            'avatar_ok_'.$userId,
            10,
            "Veuillez patienter avant de changer à nouveau votre photo de profil."
        );
    }

    /** Call after a successful comment post. */
    public function markCommentPosted(int $userId): void
    {
        $this->markSuccess('comment_ok_'.$userId);
    }

    /** Call after a successful rating write/delete. */
    public function markRatingAction(int $userId): void
    {
        $this->markSuccess('rating_ok_'.$userId);
    }

    /** Call after a successful avatar upload. */
    public function markAvatarUploaded(int $userId): void
    {
        $this->markSuccess('avatar_ok_'.$userId);
    }

    public function assertCanPostGamificationEvent(int $userId): void
    {
        $this->assertMinGapSinceLastSuccess(
            'gamification_evt_'.$userId,
            2,
            'Patience — les événements d\'exploration sont limités.'
        );
    }

    public function markGamificationEventPosted(int $userId): void
    {
        $this->markSuccess('gamification_evt_'.$userId);
    }

    public function assertCanPostForumReply(int $userId): void
    {
        $this->assertMinGapSinceLastSuccess(
            'forum_reply_ok_'.$userId,
            30,
            'Veuillez patienter 30 secondes entre deux réponses.'
        );
    }

    public function markForumReplyPosted(int $userId): void
    {
        $this->markSuccess('forum_reply_ok_'.$userId);
    }

    public function assertCanSendFriendRequest(int $userId): void
    {
        $this->assertDailyLimit('friend_req_'.$userId, 20, 'Limite de demandes d\'amis atteinte (20/jour).');
    }

    public function markFriendRequestSent(int $userId): void
    {
        $this->incrementDailyCounter('friend_req_'.$userId);
    }

    public function assertCanCreateForumThread(int $userId): void
    {
        $this->assertDailyLimit('forum_thread_'.$userId, 5, 'Limite de fils de discussion atteinte (5/jour).');
    }

    public function markForumThreadCreated(int $userId): void
    {
        $this->incrementDailyCounter('forum_thread_'.$userId);
    }

    public function assertCanShareActivity(int $userId): void
    {
        $this->assertDailyLimit('share_act_'.$userId, 30, 'Limite de partages atteinte (30/jour).');
    }

    public function markActivityShared(int $userId): void
    {
        $this->incrementDailyCounter('share_act_'.$userId);
    }

    public function assertCanCreateGroup(int $userId): void
    {
        $this->assertDailyLimit('create_group_'.$userId, 3, 'Limite de création de groupes atteinte (3/jour).');
    }

    public function markGroupCreated(int $userId): void
    {
        $this->incrementDailyCounter('create_group_'.$userId);
    }

    public function assertCanToggleForumLike(int $userId): void
    {
        $this->assertHourlyLimit('forum_like_'.$userId, 60, 'Trop de likes. Réessayez plus tard.');
    }

    public function markForumLikeToggled(int $userId): void
    {
        $this->incrementHourlyCounter('forum_like_'.$userId);
    }

    public function assertCanReportForumContent(int $userId): void
    {
        $this->assertDailyLimit('forum_report_'.$userId, 10, 'Limite de signalements atteinte (10/jour).');
    }

    public function markForumContentReported(int $userId): void
    {
        $this->incrementDailyCounter('forum_report_'.$userId);
    }

    public function assertCanReportContent(int $userId): void
    {
        $this->assertDailyLimit('content_report_'.$userId, 15, 'Limite de signalements atteinte (15/jour).');
    }

    public function markContentReported(int $userId): void
    {
        $this->incrementDailyCounter('content_report_'.$userId);
    }

    public function assertCanSearchUsers(int $userId): void
    {
        $this->assertHourlyLimit('user_search_'.$userId, 60, 'Trop de recherches. Réessayez plus tard.');
    }

    public function markUserSearchPerformed(int $userId): void
    {
        $this->incrementHourlyCounter('user_search_'.$userId);
    }

    public function assertCanRegisterPushToken(int $userId): void
    {
        $this->assertMinGapSinceLastSuccess(
            'push_token_reg_'.$userId,
            10,
            'Veuillez patienter avant de réenregistrer le token push.'
        );
    }

    public function markPushTokenRegistered(int $userId): void
    {
        $this->markSuccess('push_token_reg_'.$userId);
    }

    public function assertCanSendChatMessage(int $userId): void
    {
        $this->assertMinGapSinceLastSuccess(
            'chat_msg_ok_'.$userId,
            2,
            'Veuillez patienter quelques secondes entre deux messages.'
        );
    }

    public function markChatMessageSent(int $userId): void
    {
        $this->markSuccess('chat_msg_ok_'.$userId);
    }

    private function assertDailyLimit(string $key, int $max, string $message): void
    {
        $count = (int) $this->cache->get($key, static function (ItemInterface $item) {
            $item->expiresAfter(86400);

            return 0;
        });

        if ($count >= $max) {
            throw new ThrottledActionException($message, 3600);
        }
    }

    private function incrementDailyCounter(string $key): void
    {
        $count = (int) $this->cache->get($key, static function (ItemInterface $item) {
            $item->expiresAfter(86400);

            return 0;
        });
        $this->cache->delete($key);
        $newCount = $count + 1;
        $this->cache->get($key, static function (ItemInterface $item) use ($newCount) {
            $item->expiresAfter(86400);

            return $newCount;
        });
    }

    private function assertHourlyLimit(string $key, int $max, string $message): void
    {
        $count = (int) $this->cache->get($key, static function (ItemInterface $item) {
            $item->expiresAfter(3600);

            return 0;
        });

        if ($count >= $max) {
            throw new ThrottledActionException($message, 300);
        }
    }

    private function incrementHourlyCounter(string $key): void
    {
        $count = (int) $this->cache->get($key, static function (ItemInterface $item) {
            $item->expiresAfter(3600);

            return 0;
        });
        $this->cache->delete($key);
        $newCount = $count + 1;
        $this->cache->get($key, static function (ItemInterface $item) use ($newCount) {
            $item->expiresAfter(3600);

            return $newCount;
        });
    }

    private function assertMinGapSinceLastSuccess(string $key, int $minGapSeconds, string $message): void
    {
        $last = $this->cache->get($key, static function (ItemInterface $item) {
            $item->expiresAfter(3600);

            return 0;
        });
        $last = (int) $last;
        $now = time();
        $elapsed = $now - $last;
        if ($last > 0 && $elapsed < $minGapSeconds) {
            throw new ThrottledActionException($message, $minGapSeconds - $elapsed);
        }
    }

    private function markSuccess(string $key): void
    {
        $this->cache->delete($key);
        $this->cache->get($key, static function (ItemInterface $item) {
            $item->expiresAfter(3600);

            return time();
        });
    }
}
