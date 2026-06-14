<?php

declare(strict_types=1);

namespace App\Service;

use App\Repository\UserRepository;

/**
 * Génère un alias public unique à partir d'une adresse e-mail.
 *
 * L'alias est nettoyé pour respecter les contraintes de l'entité User
 * (Assert\Regex : lettres, chiffres, espaces et - _ . ' uniquement ; 2 à 60 caractères)
 * puis dédoublonné contre la base et un éventuel lot en cours.
 */
final class AliasGenerator
{
    private const MAX_LENGTH = 60;

    public function __construct(
        private readonly UserRepository $userRepository,
    ) {
    }

    /**
     * @param list<string> $reserved alias déjà attribués dans le lot courant (non encore flushés)
     */
    public function fromEmail(string $email, array $reserved = []): string
    {
        $base = $this->sanitize($this->localPart($email));

        $candidate = $base;
        $suffix = 1;
        while ($this->isTaken($candidate, $reserved)) {
            ++$suffix;
            $tail = (string) $suffix;
            $candidate = mb_substr($base, 0, self::MAX_LENGTH - mb_strlen($tail)).$tail;
        }

        return $candidate;
    }

    private function localPart(string $email): string
    {
        $local = strstr($email, '@', true);

        return false === $local ? $email : $local;
    }

    private function sanitize(string $raw): string
    {
        // Ne conserve que les caractères autorisés par l'Assert\Regex de l'alias.
        $clean = preg_replace("/[^\\p{L}\\p{N}\\s\\-_'.]/u", '', $raw) ?? '';
        $clean = trim($clean);

        if (mb_strlen($clean) < 2) {
            $clean = 'odos'.$clean;
        }

        return mb_substr($clean, 0, self::MAX_LENGTH);
    }

    /**
     * @param list<string> $reserved
     */
    private function isTaken(string $alias, array $reserved): bool
    {
        $lower = mb_strtolower($alias);
        foreach ($reserved as $taken) {
            if (mb_strtolower($taken) === $lower) {
                return true;
            }
        }

        return [] !== $this->userRepository->findForUniqueAlias(['alias' => $alias]);
    }
}
