<?php

declare(strict_types=1);

namespace App\Tests;

use App\Security\AdminMfaService;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class AdminMfaServiceTest extends TestCase
{
    // RFC 6238, annexe B : secret ASCII "12345678901234567890" encodé en Base32.
    private const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

    private const ENV_NAMES = [
        'ADMIN_MFA_SMS_ENABLED',
        'ADMIN_MFA_TOTP_SETUP_ENABLED',
        'ADMIN_MFA_TOTP_SECRET',
        'ADMIN_MFA_PIN',
    ];

    /** @var array<string, array{env: mixed, getenv: string|false}> */
    private array $savedEnv = [];

    protected function setUp(): void
    {
        foreach (self::ENV_NAMES as $name) {
            $this->savedEnv[$name] = ['env' => $_ENV[$name] ?? null, 'getenv' => getenv($name)];
            $this->unsetEnv($name);
        }
    }

    protected function tearDown(): void
    {
        foreach ($this->savedEnv as $name => $saved) {
            $this->unsetEnv($name);
            if (null !== $saved['env']) {
                $_ENV[$name] = $saved['env'];
            }
            if (false !== $saved['getenv']) {
                putenv($name.'='.$saved['getenv']);
            }
        }
    }

    public function testSmsStepIsDisabledByDefault(): void
    {
        self::assertFalse((new AdminMfaService())->isSmsStepRequired());
    }

    public function testTotpSetupIsClosedByDefault(): void
    {
        self::assertFalse((new AdminMfaService())->isTotpSetupEnabled());
    }

    #[DataProvider('boolFlagProvider')]
    public function testSmsFlagParsing(string $value, bool $expected): void
    {
        $_ENV['ADMIN_MFA_SMS_ENABLED'] = $value;

        self::assertSame($expected, (new AdminMfaService())->isSmsStepRequired());
    }

    #[DataProvider('boolFlagProvider')]
    public function testTotpSetupFlagParsing(string $value, bool $expected): void
    {
        $_ENV['ADMIN_MFA_TOTP_SETUP_ENABLED'] = $value;

        self::assertSame($expected, (new AdminMfaService())->isTotpSetupEnabled());
    }

    /**
     * @return iterable<string, array{string, bool}>
     */
    public static function boolFlagProvider(): iterable
    {
        yield '1' => ['1', true];
        yield 'true' => ['true', true];
        yield '0' => ['0', false];
        yield 'false' => ['false', false];
        yield 'empty' => ['', false];
        yield 'garbage' => ['maybe', false];
    }

    public function testFlagIsReadFromGetenvWhenNotInEnvArray(): void
    {
        putenv('ADMIN_MFA_SMS_ENABLED=1');

        self::assertTrue((new AdminMfaService())->isSmsStepRequired());
    }

    #[DataProvider('rfc6238Provider')]
    public function testTotpMatchesRfc6238Vectors(int $timestamp, string $code): void
    {
        $_ENV['ADMIN_MFA_TOTP_SECRET'] = self::RFC_SECRET;

        self::assertTrue((new AdminMfaService())->isTotpValid($code, 0, $timestamp));
    }

    /**
     * Codes à 8 chiffres de la RFC tronqués aux 6 derniers (modulo 10^6).
     *
     * @return iterable<string, array{int, string}>
     */
    public static function rfc6238Provider(): iterable
    {
        yield 'T=59' => [59, '287082'];
        yield 'T=1111111109' => [1111111109, '081804'];
        yield 'T=1234567890' => [1234567890, '005924'];
    }

    public function testTotpRejectsWrongCode(): void
    {
        $_ENV['ADMIN_MFA_TOTP_SECRET'] = self::RFC_SECRET;

        self::assertFalse((new AdminMfaService())->isTotpValid('287083', 0, 59));
    }

    public function testTotpAcceptsAdjacentWindowOnly(): void
    {
        $_ENV['ADMIN_MFA_TOTP_SECRET'] = self::RFC_SECRET;
        $service = new AdminMfaService();

        // Code du créneau T=59 (slice 1), vérifié 30 s plus tard (slice 2).
        self::assertTrue($service->isTotpValid('287082', 1, 89));
        self::assertFalse($service->isTotpValid('287082', 0, 89));
        self::assertFalse($service->isTotpValid('287082', 1, 150));
    }

    public function testTotpRejectsMalformedCodes(): void
    {
        $_ENV['ADMIN_MFA_TOTP_SECRET'] = self::RFC_SECRET;
        $service = new AdminMfaService();

        self::assertFalse($service->isTotpValid('', 1, 59));
        self::assertFalse($service->isTotpValid('28708', 1, 59));
        self::assertFalse($service->isTotpValid('2870821', 1, 59));
    }

    public function testTotpAcceptsCodeWithSpaces(): void
    {
        $_ENV['ADMIN_MFA_TOTP_SECRET'] = self::RFC_SECRET;

        self::assertTrue((new AdminMfaService())->isTotpValid('287 082', 0, 59));
    }

    public function testTotpFailsWithoutSecret(): void
    {
        self::assertFalse((new AdminMfaService())->isTotpValid('287082', 1, 59));
    }

    public function testGetTotpSecretIsNormalizedToUppercase(): void
    {
        $_ENV['ADMIN_MFA_TOTP_SECRET'] = ' '.strtolower(self::RFC_SECRET).' ';

        self::assertSame(self::RFC_SECRET, (new AdminMfaService())->getTotpSecret());
    }

    private function unsetEnv(string $name): void
    {
        unset($_ENV[$name]);
        putenv($name);
    }
}
