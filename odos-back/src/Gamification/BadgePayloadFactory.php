<?php

declare(strict_types=1);

namespace App\Gamification;

use App\Entity\BadgeDefinition;
use App\Entity\UserBadge;
use App\Entity\UserBadgeDisplay;
use App\Enum\BadgeRuleType;

/**
 * Sérialisation stable des badges pour l'API mobile (sans exposer ruleConfig sensible).
 */
final class BadgePayloadFactory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(BadgeDefinition $badge, bool $owned, ?UserBadge $userBadge = null, ?UserBadgeDisplay $display = null): array
    {
        $payload = [
            'id' => $badge->getId(),
            'code' => $badge->getCode(),
            'name' => $badge->getName(),
            'description' => $badge->getDescription(),
            'imageUrl' => $badge->getImageUrl(),
            'sortOrder' => $badge->getSortOrder(),
            'owned' => $owned,
            'ruleHint' => $this->ruleHint($badge),
        ];

        if ($userBadge instanceof UserBadge) {
            $payload['unlockedAt'] = $userBadge->getUnlockedAt()->format(\DateTimeInterface::ATOM);
            $payload['seenAt'] = $userBadge->getSeenAt()?->format(\DateTimeInterface::ATOM);
            $payload['isUnseen'] = $userBadge->isUnseen();
        }

        if ($display instanceof UserBadgeDisplay) {
            $payload['displayOnProfile'] = $display->isDisplayedOnProfile();
            $payload['displayOrder'] = $display->getDisplayOrder();
        } elseif ($owned) {
            $payload['displayOnProfile'] = !$badge->isHiddenByDefault();
            $payload['displayOrder'] = null;
        }

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    public function unlocked(UserBadge $userBadge, UserBadgeDisplay $display): array
    {
        $badge = $userBadge->getBadge();
        if (!$badge instanceof BadgeDefinition) {
            return [];
        }

        return $this->definition($badge, true, $userBadge, $display);
    }

    private function ruleHint(BadgeDefinition $badge): string
    {
        $config = $badge->getRuleConfig() ?? [];
        $threshold = max(1, (int) ($config['threshold'] ?? 1));

        return match ($badge->getRuleType()) {
            BadgeRuleType::Manual => 'Attribué par l\'équipe ODOS',
            BadgeRuleType::ActivityViews => sprintf('Consulte %d fiche(s) d\'activité', $threshold),
            BadgeRuleType::FavoritesCount => sprintf('Ajoute %d favori(s)', $threshold),
            BadgeRuleType::CommentsCount => sprintf('Publie %d commentaire(s)', $threshold),
            BadgeRuleType::RatingsCount => sprintf('Note %d activité(s)', $threshold),
            BadgeRuleType::CategoryExplorer => sprintf('Explore %d lieu(x) dans une catégorie', $threshold),
            BadgeRuleType::MapCells => 'Exploration carte',
            BadgeRuleType::ForumThreadsCount => sprintf('Crée %d fil(s) forum', $threshold),
            BadgeRuleType::ForumRepliesCount => sprintf('Publie %d réponse(s) forum', $threshold),
            BadgeRuleType::FriendsCount => sprintf('Ajoute %d ami(s)', $threshold),
            BadgeRuleType::GroupsCount => sprintf('Rejoint %d groupe(s)', $threshold),
            BadgeRuleType::SharesCount => sprintf('Partage %d activité(s)', $threshold),
            BadgeRuleType::Custom => 'Objectif spécial',
        };
    }
}
