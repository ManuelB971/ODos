<?php

declare(strict_types=1);

namespace App\Enum;

/**
 * Stratégie d'attribution automatique d'un badge (catalogue admin).
 */
enum BadgeRuleType: string
{
    case Manual = 'manual';
    case ActivityViews = 'activity_views';
    case FavoritesCount = 'favorites_count';
    case CommentsCount = 'comments_count';
    case RatingsCount = 'ratings_count';
    case CategoryExplorer = 'category_explorer';
    /** Pourcentage de cellules carte visitées (exploration GPS). */
    case MapCells = 'map_cells';
    case ForumThreadsCount = 'forum_threads_count';
    case ForumRepliesCount = 'forum_replies_count';
    case FriendsCount = 'friends_count';
    case GroupsCount = 'groups_count';
    case SharesCount = 'shares_count';
    case Custom = 'custom';

    public function label(): string
    {
        return match ($this) {
            self::Manual => 'Attribution manuelle (admin)',
            self::ActivityViews => 'Nombre de fiches activité consultées',
            self::FavoritesCount => 'Nombre de favoris',
            self::CommentsCount => 'Nombre de commentaires publiés',
            self::RatingsCount => 'Nombre de notes données',
            self::CategoryExplorer => 'Activités vues dans une catégorie',
            self::MapCells => 'Exploration carte (% zone visitée)',
            self::ForumThreadsCount => 'Nombre de fils forum créés',
            self::ForumRepliesCount => 'Nombre de réponses forum',
            self::FriendsCount => 'Nombre d\'amis',
            self::GroupsCount => 'Nombre de groupes',
            self::SharesCount => 'Nombre de partages d\'activités',
            self::Custom => 'Personnalisé (non évalué auto)',
        };
    }
}
