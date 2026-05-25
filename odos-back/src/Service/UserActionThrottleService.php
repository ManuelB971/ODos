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
