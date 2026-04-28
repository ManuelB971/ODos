<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Résultat d'un import d'activités.
 */
final class ActivityImportResult
{
    public int $createdCount = 0;
    public int $skippedCount = 0;
    /** @var list<string> */
    public array $errors = [];
    public ?string $fatalError = null;

    public function isSuccess(): bool
    {
        return null === $this->fatalError;
    }
}
