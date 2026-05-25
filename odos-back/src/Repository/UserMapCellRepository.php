<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\User;
use App\Entity\UserMapCell;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserMapCell>
 */
class UserMapCellRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserMapCell::class);
    }

    public function countForUserInZone(User $user, string $zoneKey): int
    {
        return (int) $this->createQueryBuilder('c')
            ->select('COUNT(c.id)')
            ->andWhere('c.user = :user')
            ->andWhere('c.zoneKey = :zone')
            ->setParameter('user', $user)
            ->setParameter('zone', $zoneKey)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * @return list<string>
     */
    public function findCellIdsForUser(User $user, string $zoneKey): array
    {
        $rows = $this->createQueryBuilder('c')
            ->select('c.cellId')
            ->andWhere('c.user = :user')
            ->andWhere('c.zoneKey = :zone')
            ->setParameter('user', $user)
            ->setParameter('zone', $zoneKey)
            ->getQuery()
            ->getSingleColumnResult();

        return array_values(array_map('strval', $rows));
    }

    public function findOneForUserAndCell(User $user, string $cellId): ?UserMapCell
    {
        return $this->findOneBy(['user' => $user, 'cellId' => $cellId]);
    }
}
