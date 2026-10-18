<?php

declare(strict_types=1);

namespace App\Tests;

use App\Controller\Api\HealthController;
use App\Service\HealthChecker;
use Doctrine\DBAL\Connection;
use Doctrine\DBAL\Result;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\DependencyInjection\Container;

final class HealthCheckerTest extends TestCase
{
    public function testAllDependenciesUp(): void
    {
        $checker = $this->checker($this->workingConnection(), static fn (): object => new FakeRedis());

        self::assertSame(['database' => 'ok', 'redis' => 'ok'], $checker->check());
    }

    public function testRedisClientWithMagicCommandsLikePredisIsHealthy(): void
    {
        $checker = $this->checker($this->workingConnection(), static fn (): object => new FakeMagicRedis());

        self::assertSame(['database' => 'ok', 'redis' => 'ok'], $checker->check());
    }

    public function testRealPredisClientIsAccepted(): void
    {
        // Predis n'a pas de méthode ping() déclarée : elle passe par __call.
        self::assertFalse(method_exists(\Predis\Client::class, 'ping'));
        self::assertTrue(is_callable([new \Predis\Client('redis://unused:6379'), 'ping']));
    }

    public function testDatabaseDownIsReportedWithoutLeakingTheError(): void
    {
        $connection = $this->createMock(Connection::class);
        $connection->method('fetchOne')->willThrowException(new \RuntimeException('password authentication failed for user "odos"'));

        $checker = $this->checker($connection, static fn (): object => new FakeRedis());

        self::assertSame(['database' => 'fail', 'redis' => 'ok'], $checker->check());
    }

    public function testRedisDownIsReported(): void
    {
        $checker = $this->checker(
            $this->workingConnection(),
            static fn (): object => throw new \RuntimeException('Connection refused [tcp://redis:6379]'),
        );

        self::assertSame(['database' => 'ok', 'redis' => 'fail'], $checker->check());
    }

    public function testControllerAnswers503WithOnlyStatusesWhenADependencyFails(): void
    {
        $controller = new HealthController($this->checker(
            $this->workingConnection(),
            static fn (): object => throw new \RuntimeException('secret-host:6379'),
        ));
        $controller->setContainer(new Container());

        $response = $controller();

        self::assertSame(503, $response->getStatusCode());
        self::assertSame('no-store, private', $response->headers->get('Cache-Control'));
        $body = (string) $response->getContent();
        self::assertJsonStringEqualsJsonString(
            '{"status":"fail","checks":{"database":"ok","redis":"fail"}}',
            $body,
        );
        self::assertStringNotContainsString('secret-host', $body);
    }

    public function testControllerAnswers200WhenHealthy(): void
    {
        $controller = new HealthController($this->checker($this->workingConnection(), static fn (): object => new FakeRedis()));
        $controller->setContainer(new Container());

        $response = $controller();

        self::assertSame(200, $response->getStatusCode());
        self::assertJsonStringEqualsJsonString(
            '{"status":"ok","checks":{"database":"ok","redis":"ok"}}',
            (string) $response->getContent(),
        );
    }

    /**
     * @param \Closure(): object $redisFactory
     */
    private function checker(Connection $connection, \Closure $redisFactory): HealthChecker
    {
        return new HealthChecker($connection, new NullLogger(), 'redis://unused:6379', $redisFactory);
    }

    private function workingConnection(): Connection
    {
        $connection = $this->createMock(Connection::class);
        $connection->method('fetchOne')->with('SELECT 1')->willReturn(1);

        return $connection;
    }
}

final class FakeRedis
{
    public function ping(): string
    {
        return 'PONG';
    }
}

/** Comme Predis\Client : les commandes Redis passent par __call. */
final class FakeMagicRedis
{
    /**
     * @param list<mixed> $arguments
     */
    public function __call(string $command, array $arguments): string
    {
        if ('ping' !== strtolower($command)) {
            throw new \BadMethodCallException($command);
        }

        return 'PONG';
    }
}
