<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\PushToken;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<PushToken>
 */
class PushTokenRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, PushToken::class);
    }

    public function findByToken(string $token): ?PushToken
    {
        return $this->findOneBy(['token' => $token]);
    }

    /**
     * @return list<string>
     */
    public function findTokensForUser(User $user): array
    {
        $rows = $this->createQueryBuilder('t')
            ->select('t.token')
            ->andWhere('t.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getScalarResult();

        return array_values(array_map(static fn (array $row): string => (string) $row['token'], $rows));
    }
}
