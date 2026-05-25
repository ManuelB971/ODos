<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Pseudonymisation d'emails pour logs et audit (minimisation PII).
 */
final class EmailPseudonymizer
{
    public function hash(string $email): string
    {
        return hash('sha256', strtolower(trim($email)));
    }

    /**
     * Forme affichable : j***@example.com (premier caractère + domaine conservés).
     */
    public function pseudonymize(string $email): string
    {
        $email = strtolower(trim($email));
        $at = strpos($email, '@');
        if (false === $at || 0 === $at) {
            return '***';
        }

        $local = substr($email, 0, $at);
        $domain = substr($email, $at);

        return substr($local, 0, 1).'***'.$domain;
    }
}
