<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Activity;
use App\Entity\Category;
use App\Entity\Comment;
use App\Entity\User;
use App\Repository\CommentRepository;
use App\Repository\ForumReplyLikeRepository;
use App\Repository\ForumReplyRepository;
use App\Repository\ForumThreadRepository;
use App\Repository\FriendshipRepository;
use App\Repository\GroupMemberRepository;
use App\Repository\SharedActivityRepository;
use App\Repository\UserBadgeDisplayRepository;
use App\Repository\UserBadgeRepository;
use App\Repository\UserMapCellRepository;
use App\Enum\FriendshipStatus;
use App\Service\MapExplorationZoneRegistry;

/**
 * Export des données personnelles (art. 20 RGPD) au format JSON structuré.
 */
final class UserDataExportService
{
    public function __construct(
        private readonly CommentRepository $commentRepository,
        private readonly UserBadgeRepository $userBadgeRepository,
        private readonly UserBadgeDisplayRepository $userBadgeDisplayRepository,
        private readonly UserMapCellRepository $userMapCellRepository,
        private readonly MapExplorationZoneRegistry $zoneRegistry,
        private readonly FriendshipRepository $friendshipRepository,
        private readonly ForumThreadRepository $forumThreadRepository,
        private readonly ForumReplyRepository $forumReplyRepository,
        private readonly SharedActivityRepository $sharedActivityRepository,
        private readonly GroupMemberRepository $groupMemberRepository,
        private readonly ForumReplyLikeRepository $forumReplyLikeRepository,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function export(User $user): array
    {
        $comments = $this->commentRepository->findBy(['author' => $user], ['createdAt' => 'DESC']);
        $ratings = $user->getActivityRatings()->toArray();

        return [
            'exportedAt' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'format' => 'odos-gdpr-export-v2',
            'profile' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'alias' => $user->getAlias(),
                'bio' => $user->getBio(),
                'avatarUrl' => $user->getAvatarUrl(),
                'displayName' => $user->getDisplayName(),
                'consentedAt' => $user->getConsentedAt()?->format(\DateTimeInterface::ATOM),
                'hideBadgesOnProfile' => $user->isHideBadgesOnProfile(),
                'mapExplorationConsentAt' => $user->getMapExplorationConsentAt()?->format(\DateTimeInterface::ATOM),
                'mapExplorationEnabled' => $user->isMapExplorationEnabled(),
                'homeCity' => $user->getHomeCity(),
                'interests' => array_map(
                    static fn (Category $c) => [
                        'id' => $c->getId(),
                        'name' => $c->getName(),
                    ],
                    $user->getInterests()->toArray()
                ),
            ],
            'favorites' => array_map(
                static fn (Activity $a) => [
                    'id' => $a->getId(),
                    'name' => $a->getName(),
                    'city' => $a->getCity(),
                ],
                $user->getFavorites()->toArray()
            ),
            'visitedActivities' => array_map(
                static fn (Activity $a) => [
                    'id' => $a->getId(),
                    'name' => $a->getName(),
                    'city' => $a->getCity(),
                ],
                $user->getVisitedActivities()->toArray()
            ),
            'comments' => array_map(
                static fn (Comment $c) => [
                    'id' => $c->getId(),
                    'activityId' => $c->getActivity()?->getId(),
                    'content' => $c->getContent(),
                    'createdAt' => $c->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                    'updatedAt' => $c->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
                    'isHidden' => $c->isHidden(),
                ],
                $comments
            ),
            'ratings' => array_map(
                static function ($rating) {
                    return [
                        'activityId' => $rating->getActivity()?->getId(),
                        'activityName' => $rating->getActivity()?->getName(),
                        'score' => $rating->getScore(),
                        'createdAt' => $rating->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                        'updatedAt' => $rating->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
                    ];
                },
                $ratings
            ),
            'badges' => array_map(
                static function ($userBadge) {
                    $badge = $userBadge->getBadge();

                    return [
                        'code' => $badge?->getCode(),
                        'name' => $badge?->getName(),
                        'unlockedAt' => $userBadge->getUnlockedAt()->format(\DateTimeInterface::ATOM),
                        'seenAt' => $userBadge->getSeenAt()?->format(\DateTimeInterface::ATOM),
                    ];
                },
                $this->userBadgeRepository->findForUserOrdered($user)
            ),
            'badgeDisplayPreferences' => array_map(
                static function ($display) {
                    return [
                        'badgeCode' => $display->getBadge()?->getCode(),
                        'displayOnProfile' => $display->isDisplayedOnProfile(),
                        'displayOrder' => $display->getDisplayOrder(),
                    ];
                },
                $this->userBadgeDisplayRepository->findBy(['user' => $user])
            ),
            'mapExploration' => [
                'zoneKey' => $this->zoneRegistry->getCatalogZone()['zoneKey'],
                'visitedCellIds' => $this->userMapCellRepository->findCellIdsForUser(
                    $user,
                    $this->zoneRegistry->getCatalogZone()['zoneKey']
                ),
            ],
            'social' => $this->exportSocialData($user),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function exportSocialData(User $user): array
    {
        $friendships = $this->friendshipRepository->findForUser($user, 1, 500);
        $friends = [];
        foreach ($friendships as $f) {
            if (FriendshipStatus::Accepted !== $f->getStatus()) {
                continue;
            }
            $other = $f->getSender()?->getId() === $user->getId() ? $f->getReceiver() : $f->getSender();
            if (null !== $other) {
                $friends[] = [
                    'alias' => $other->getDisplayName(),
                    'since' => $f->getAcceptedAt()?->format(\DateTimeInterface::ATOM),
                ];
            }
        }

        $threads = $this->forumThreadRepository->findBy(['author' => $user], ['createdAt' => 'DESC']);
        $replies = $this->forumReplyRepository->findBy(['author' => $user], ['createdAt' => 'DESC']);
        $sentShares = $this->sharedActivityRepository->findBy(['sender' => $user], ['createdAt' => 'DESC']);
        $receivedShares = $this->sharedActivityRepository->findBy(['receiver' => $user], ['createdAt' => 'DESC']);
        $memberships = $this->groupMemberRepository->findBy(['user' => $user]);
        $likes = $this->forumReplyLikeRepository->findBy(['user' => $user], ['createdAt' => 'DESC']);

        return [
            'friends' => $friends,
            'forumThreads' => array_map(static fn ($t) => [
                'title' => $t->getTitle(),
                'content' => $t->getContent(),
                'createdAt' => $t->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ], $threads),
            'forumReplies' => array_map(static fn ($r) => [
                'content' => $r->getContent(),
                'createdAt' => $r->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ], $replies),
            'sharedActivitiesSent' => array_map(static fn ($s) => [
                'activityName' => $s->getActivity()?->getName(),
                'message' => $s->getMessage(),
                'createdAt' => $s->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ], $sentShares),
            'sharedActivitiesReceived' => array_map(static fn ($s) => [
                'activityName' => $s->getActivity()?->getName(),
                'message' => $s->getMessage(),
                'createdAt' => $s->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ], $receivedShares),
            'groups' => array_map(static fn ($m) => [
                'name' => $m->getGroup()?->getName(),
                'role' => $m->getRole()->value,
                'joinedAt' => $m->getJoinedAt()->format(\DateTimeInterface::ATOM),
            ], $memberships),
            'forumLikes' => array_map(static fn ($l) => [
                'replyExcerpt' => mb_substr($l->getReply()?->getContent() ?? '', 0, 80),
                'threadTitle' => $l->getReply()?->getThread()?->getTitle(),
                'createdAt' => $l->getCreatedAt()->format(\DateTimeInterface::ATOM),
            ], $likes),
        ];
    }
}
