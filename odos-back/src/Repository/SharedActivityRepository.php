<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\SharedActivity;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SharedActivity>
 */
class SharedActivityRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SharedActivity::class);
    }

    /**
     * @return list<SharedActivity>
     */
    public function findReceivedPaginated(User $user, int $page, int $perPage): array
    {
        return $this->applyVisibleToUser($this->createQueryBuilder('s'), $user)
            ->orderBy('s.createdAt', 'DESC')
            ->setFirstResult(max(0, ($page - 1) * $perPage))
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();
    }

    public function countReceived(User $user): int
    {
        return (int) $this->applyVisibleToUser(
            $this->createQueryBuilder('s')->select('COUNT(s.id)'),
            $user,
        )
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function countUnreadForReceiver(User $user): int
    {
        return (int) $this->applyVisibleToUser(
            $this->createQueryBuilder('s')->select('COUNT(s.id)'),
            $user,
        )
            ->andWhere('s.seenAt IS NULL')
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function countBySender(User $sender): int
    {
        return (int) $this->createQueryBuilder('s')
            ->select('COUNT(s.id)')
            ->andWhere('s.sender = :sender')
            ->setParameter('sender', $sender)
            ->getQuery()
            ->getSingleScalarResult();
    }

    private function applyVisibleToUser(QueryBuilder $qb, User $user, string $alias = 's'): QueryBuilder
    {
        return $qb
            ->andWhere(sprintf(
                '%s.receiver = :user OR (%s.receiver IS NULL AND %s.group IS NOT NULL AND EXISTS (
                    SELECT 1 FROM App\Entity\GroupMember gm
                    WHERE gm.group = %s.group AND gm.user = :user
                ))',
                $alias,
                $alias,
                $alias,
                $alias,
            ))
            ->setParameter('user', $user);
    }
}
