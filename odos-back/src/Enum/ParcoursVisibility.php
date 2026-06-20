<?php

declare(strict_types=1);

namespace App\Enum;

/**
 * Visibilité d'un parcours (modèle « playlist » Spotify).
 *
 * - Public : consultable en lecture par tout utilisateur connecté (lien partagé).
 * - Private : visible uniquement par le propriétaire et ses collaborateurs.
 */
enum ParcoursVisibility: string
{
    case Public = 'public';
    case Private = 'private';
}
