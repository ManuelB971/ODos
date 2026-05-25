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
            self::Custom => 'Personnalisé (non évalué auto)',
        };
    }
}
