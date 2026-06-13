<?php

declare(strict_types=1);

namespace App\Gamification;

use App\Entity\User;
use App\Repository\CommentRepository;
use App\Repository\ForumReplyRepository;
use App\Repository\ForumThreadRepository;
use App\Repository\FriendshipRepository;
use App\Repository\GroupMemberRepository;
use App\Repository\SharedActivityRepository;
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
        private readonly ForumThreadRepository $forumThreadRepository,
        private readonly ForumReplyRepository $forumReplyRepository,
        private readonly FriendshipRepository $friendshipRepository,
        private readonly GroupMemberRepository $groupMemberRepository,
        private readonly SharedActivityRepository $sharedActivityRepository,
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
            forumThreadsCount: $this->forumThreadRepository->countByAuthor($user),
            forumRepliesCount: $this->forumReplyRepository->countByAuthor($user),
            friendsCount: $this->friendshipRepository->countAcceptedFriends($user),
            groupsCount: $this->groupMemberRepository->countForUser($user),
            sharesCount: $this->sharedActivityRepository->countBySender($user),
        );
    }

    public function activityViewsInCategory(User $user, int $categoryId): int
    {
        return $this->activityViewRepository->countForUserInCategory($user, $categoryId);
    }
}
