<?php

declare(strict_types=1);

namespace App\Service;

use Doctrine\DBAL\Connection;
use Psr\Log\LoggerInterface;
use Symfony\Component\Cache\Adapter\RedisAdapter;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Vérifie les dépendances de l'API pour /api/health (sonde blackbox, healthcheck
 * du déploiement). Le résultat ne contient que "ok" / "fail" : le détail des
 * erreurs va dans les logs, jamais dans la réponse publique.
 */
class HealthChecker
{
    /** @var \Closure(): object */
    private \Closure $redisFactory;

    /**
     * @param (\Closure(): object)|null $redisFactory connexion Redis (injectable pour les tests)
     */
    public function __construct(
        private readonly Connection $connection,
        private readonly LoggerInterface $logger,
        #[Autowire(env: 'REDIS_URL')]
        string $redisUrl,
        ?\Closure $redisFactory = null,
    ) {
        $this->redisFactory = $redisFactory
            ?? static fn (): object => RedisAdapter::createConnection($redisUrl, ['timeout' => 1, 'read_timeout' => 1]);
    }

    /**
     * @return array{database: 'ok'|'fail', redis: 'ok'|'fail'}
     */
    public function check(): array
    {
        return [
            'database' => $this->probe('database', function (): void {
                $this->connection->fetchOne('SELECT 1');
            }),
            'redis' => $this->probe('redis', function (): void {
                $redis = ($this->redisFactory)();
                // `is_callable` et non `method_exists` : Predis (client utilisé en prod,
                // l'image n'a pas l'extension phpredis) expose ses commandes via
                // `__call`. Avec `method_exists`, Redis était toujours signalé en échec.
                if (!is_callable([$redis, 'ping'])) {
                    throw new \LogicException('Client Redis sans ping()');
                }
                $redis->ping();
            }),
        ];
    }

    /**
     * @param callable(): void $probe
     *
     * @return 'ok'|'fail'
     */
    private function probe(string $name, callable $probe): string
    {
        try {
            $probe();

            return 'ok';
        } catch (\Throwable $e) {
            $this->logger->error('Healthcheck {dependency} en échec : {error}', [
                'dependency' => $name,
                'error' => $e->getMessage(),
                'exception_class' => $e::class,
            ]);

            return 'fail';
        }
    }
}
