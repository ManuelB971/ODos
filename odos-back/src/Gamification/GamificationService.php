<?php

declare(strict_types=1);

namespace App\Gamification;

use App\Entity\Activity;
use App\Entity\BadgeDefinition;
use App\Entity\User;
use App\Entity\UserBadge;
use App\Entity\UserBadgeDisplay;
use App\Repository\ActivityRepository;
use App\Repository\BadgeDefinitionRepository;
use App\Repository\UserActivityViewRepository;
use App\Repository\UserBadgeDisplayRepository;
use App\Repository\UserBadgeRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

final class GamificationService
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly BadgeDefinitionRepository $badgeRepository,
        private readonly UserBadgeRepository $userBadgeRepository,
        private readonly UserBadgeDisplayRepository $displayRepository,
        private readonly UserActivityViewRepository $activityViewRepository,
        private readonly ActivityRepository $activityRepository,
        private readonly GamificationStatsProvider $statsProvider,
        private readonly BadgeRuleEvaluator $ruleEvaluator,
        private readonly BadgePayloadFactory $payloadFactory,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * @param array<string, mixed> $context
     *
     * @return list<array<string, mixed>> Badges nouvellement débloqués
     */
    public function evaluateAndAward(User $user, string $event, array $context = []): array
    {
        $this->applyEventSideEffects($user, $event, $context);

        $stats = $this->statsProvider->forUser($user);
        $newlyUnlocked = [];

        foreach ($this->badgeRepository->findAutoAwardCandidates() as $badge) {
            if ($this->userBadgeRepository->userOwnsBadge($user, $badge)) {
                continue;
            }
            if (!$this->ruleEvaluator->isSatisfied($badge, $user, $stats)) {
                continue;
            }

            $awarded = $this->awardBadge($user, $badge);
            if ($awarded instanceof UserBadge) {
                $display = $this->displayRepository->findOneForUserAndBadge($user, $badge);
                if ($display instanceof UserBadgeDisplay) {
                    $newlyUnlocked[] = $this->payloadFactory->unlocked($awarded, $display);
                }
            }
        }

        if ([] !== $newlyUnlocked) {
            $this->em->flush();
        }

        return $newlyUnlocked;
    }

    public function awardBadge(User $user, BadgeDefinition $badge): ?UserBadge
    {
        if (!$badge->isActive()) {
            return null;
        }

        if ($this->userBadgeRepository->userOwnsBadge($user, $badge)) {
            return $this->userBadgeRepository->findOneForUserAndBadge($user, $badge);
        }

        $userBadge = new UserBadge();
        $userBadge->setUser($user);
        $userBadge->setBadge($badge);
        $this->em->persist($userBadge);

        $display = new UserBadgeDisplay();
        $display->setUser($user);
        $display->setBadge($badge);
        $display->setIsDisplayedOnProfile(!$badge->isHiddenByDefault());
        $this->em->persist($display);

        $this->logger->info('gamification.badge_unlocked', [
            'userId' => $user->getId(),
            'badgeCode' => $badge->getCode(),
        ]);

        return $userBadge;
    }

    /**
     * @param array<string, mixed> $context
     */
    private function applyEventSideEffects(User $user, string $event, array $context): void
    {
        if (GamificationEvent::ACTIVITY_VIEWED !== $event) {
            return;
        }

        $activityId = (int) ($context['activityId'] ?? 0);
        if ($activityId <= 0) {
            return;
        }

        $activity = $this->activityRepository->find($activityId);
        if (!$activity instanceof Activity || !$activity->isPublished()) {
            return;
        }

        $view = $this->activityViewRepository->recordView($user, $activity);
        $this->em->persist($view);
        $this->em->flush();
    }
}
