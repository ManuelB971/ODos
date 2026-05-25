<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Activity;
use App\Entity\Category;
use App\Entity\Comment;
use App\Entity\User;
use App\Repository\CommentRepository;
use App\Repository\UserBadgeDisplayRepository;
use App\Repository\UserBadgeRepository;
use App\Repository\UserMapCellRepository;
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
        ];
    }
}
