<?php

declare(strict_types=1);

namespace App\Tests;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Yaml\Yaml;

final class SecurityConfigTest extends TestCase
{
    public function testAdminFormLoginFallsBackToDashboardNotRoot(): void
    {
        $config = Yaml::parseFile(dirname(__DIR__).'/config/packages/security.yaml');
        self::assertIsArray($config);

        // "/" n'a pas de route : sans cible par défaut, une connexion directe sur /login finit en 404.
        self::assertSame(
            'admin',
            $config['security']['firewalls']['main']['form_login']['default_target_path'] ?? null,
        );
    }
}
