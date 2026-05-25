<?php

declare(strict_types=1);

namespace App\Gamification;

use App\Entity\BadgeDefinition;
use App\Entity\User;
use App\Entity\UserBadge;
use App\Entity\UserBadgeDisplay;
use App\Repository\BadgeDefinitionRepository;
use App\Repository\UserBadgeDisplayRepository;
use App\Repository\UserBadgeRepository;
use Doctrine\ORM\EntityManagerInterface;

final class GamificationProfileService
{
    public function __construct(
        private readonly BadgeDefinitionRepository $badgeRepository,
        private readonly UserBadgeRepository $userBadgeRepository,
        private readonly UserBadgeDisplayRepository $displayRepository,
        private readonly BadgePayloadFactory $payloadFactory,
        private readonly EntityManagerInterface $em,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function buildOverview(User $user): array
    {
        $earned = [];
        $available = [];

        foreach ($this->badgeRepository->findActiveOrdered() as $badge) {
            $userBadge = $this->userBadgeRepository->findOneForUserAndBadge($user, $badge);
            $owned = $userBadge instanceof UserBadge;
            $display = $this->displayRepository->findOneForUserAndBadge($user, $badge);

            $item = $this->payloadFactory->definition(
                $badge,
                $owned,
                $userBadge instanceof UserBadge ? $userBadge : null,
                $display
            );

            if ($owned) {
                $earned[] = $item;
            } else {
                $available[] = $item;
            }
        }

        $profileDisplayed = array_values(array_filter(
            $earned,
            fn (array $b) => true === ($b['displayOnProfile'] ?? false)
        ));
        usort($profileDisplayed, static function (array $a, array $b): int {
            $oa = $a['displayOrder'] ?? PHP_INT_MAX;
            $ob = $b['displayOrder'] ?? PHP_INT_MAX;
            if ($oa === $ob) {
                return ($a['sortOrder'] ?? 0) <=> ($b['sortOrder'] ?? 0);
            }

            return $oa <=> $ob;
        });

        if ($user->isHideBadgesOnProfile()) {
            $profileDisplayed = [];
        }

        return [
            'hideAllOnProfile' => $user->isHideBadgesOnProfile(),
            'earned' => $earned,
            'available' => $available,
            'profileDisplayed' => array_slice($profileDisplayed, 0, 6),
            'unseenCount' => count($this->userBadgeRepository->findUnseenForUser($user)),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function updateDisplay(User $user, int $badgeId, bool $displayOnProfile, ?int $displayOrder): ?array
    {
        $badge = $this->badgeRepository->find($badgeId);
        if (!$badge instanceof BadgeDefinition) {
            return null;
        }

        $userBadge = $this->userBadgeRepository->findOneForUserAndBadge($user, $badge);
        if (!$userBadge instanceof UserBadge) {
            return null;
        }

        $display = $this->displayRepository->findOneForUserAndBadge($user, $badge);
        if (!$display instanceof UserBadgeDisplay) {
            $display = new UserBadgeDisplay();
            $display->setUser($user);
            $display->setBadge($badge);
            $this->em->persist($display);
        }

        $display->setIsDisplayedOnProfile($displayOnProfile);
        $display->setDisplayOrder($displayOrder);
        $this->em->flush();

        return $this->payloadFactory->unlocked($userBadge, $display);
    }

    public function markBadgeSeen(User $user, int $badgeId): bool
    {
        $badge = $this->badgeRepository->find($badgeId);
        if (!$badge instanceof BadgeDefinition) {
            return false;
        }

        $userBadge = $this->userBadgeRepository->findOneForUserAndBadge($user, $badge);
        if (!$userBadge instanceof UserBadge) {
            return false;
        }

        $userBadge->markSeen();
        $this->em->flush();

        return true;
    }

    public function markAllSeen(User $user): int
    {
        $count = 0;
        foreach ($this->userBadgeRepository->findUnseenForUser($user) as $ub) {
            $ub->markSeen();
            ++$count;
        }
        if ($count > 0) {
            $this->em->flush();
        }

        return $count;
    }
}
