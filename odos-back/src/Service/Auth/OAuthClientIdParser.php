<?php

declare(strict_types=1);

namespace App\Service\Auth;

/**
 * Parse les client IDs OAuth depuis les variables d'environnement.
 */
final class OAuthClientIdParser
{
    public function __construct(
        private readonly string $googleClientIdsRaw,
    ) {
    }

    /** @return list<string> */
    public function googleIds(): array
    {
        if ('' === trim($this->googleClientIdsRaw)) {
            return [];
        }

        $ids = array_map('trim', explode(',', $this->googleClientIdsRaw));

        return array_values(array_filter($ids, static fn (string $id): bool => '' !== $id));
    }
}
