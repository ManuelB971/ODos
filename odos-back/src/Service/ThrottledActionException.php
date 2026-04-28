<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Lancée par {@see UserActionThrottleService} lorsqu'une action est rate-limitée.
 *
 * Porte la durée d'attente restante (en secondes) afin que les contrôleurs
 * puissent renvoyer un en-tête HTTP `Retry-After` standard ainsi qu'un
 * payload JSON structuré exploitable par le client (toast + bouton "Réessayer").
 */
final class ThrottledActionException extends \RuntimeException
{
    public function __construct(
        string $message,
        private readonly int $retryAfterSeconds,
    ) {
        parent::__construct($message);
    }

    public function getRetryAfterSeconds(): int
    {
        return max(1, $this->retryAfterSeconds);
    }
}
