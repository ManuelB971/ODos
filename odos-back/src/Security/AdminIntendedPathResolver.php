<?php

declare(strict_types=1);

namespace App\Security;

use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

/**
 * Mémorise et restaure l'URL admin demandée avant la redirection MFA / login.
 *
 * Permet d'ouvrir directement des liens du type `/admin/badge-definition/1/edit`
 * sans atterrir sur le dashboard après authentification.
 */
final class AdminIntendedPathResolver
{
    public const SESSION_KEY = 'admin_intended_path';

    public function rememberCurrentPath(Request $request): void
    {
        if (!$request->hasSession()) {
            return;
        }

        $path = $request->getRequestUri();
        if (!$this->isSafeAdminPath($path)) {
            return;
        }

        $request->getSession()->set(self::SESSION_KEY, $path);
    }

    public function resolve(Request $request, UrlGeneratorInterface $urlGenerator): string
    {
        if (!$request->hasSession()) {
            return $urlGenerator->generate('admin');
        }

        $session = $request->getSession();

        foreach ([self::SESSION_KEY, '_security.main.target_path'] as $key) {
            $path = $session->get($key);
            if (!is_string($path) || !$this->isSafeAdminPath($path)) {
                continue;
            }

            $session->remove($key);

            return $path;
        }

        return $urlGenerator->generate('admin');
    }

    private function isSafeAdminPath(string $path): bool
    {
        return str_starts_with($path, '/admin')
            && !str_starts_with($path, '/admin/mfa')
            && !str_contains($path, '//')
            && !str_contains($path, '\\');
    }
}
