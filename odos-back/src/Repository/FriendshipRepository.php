<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Friendship;
use App\Entity\User;
use App\Enum\FriendshipStatus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Friendship>
 */
class FriendshipRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Friendship::class);
    }

    public function findBetweenUsers(User $a, User $b): ?Friendship
    {
        return $this->createQueryBuilder('f')
            ->andWhere('(f.sender = :a AND f.receiver = :b) OR (f.sender = :b AND f.receiver = :a)')
            ->setParameter('a', $a)
            ->setParameter('b', $b)
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    /**
     * @return Friendship[]
     */
    public function findForUser(User $user, int $page, int $perPage): array
    {
        return $this->createQueryBuilder('f')
            ->andWhere('f.sender = :user OR f.receiver = :user')
            ->setParameter('user', $user)
            ->orderBy('f.createdAt', 'DESC')
            ->setFirstResult(max(0, ($page - 1) * $perPage))
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();
    }

    public function countAcceptedFriends(User $user): int
    {
        return (int) $this->createQueryBuilder('f')
            ->select('COUNT(f.id)')
            ->andWhere('f.status = :accepted')
            ->andWhere('f.sender = :user OR f.receiver = :user')
            ->setParameter('accepted', FriendshipStatus::Accepted)
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * Utilisateurs bloqués PAR `$blocker` (lignes Blocked dont il est le sender).
     *
     * @return Friendship[]
     */
    public function findBlockedByUser(User $blocker, int $page, int $perPage): array
    {
        return $this->createQueryBuilder('f')
            ->andWhere('f.sender = :user')
            ->andWhere('f.status = :blocked')
            ->setParameter('user', $blocker)
            ->setParameter('blocked', FriendshipStatus::Blocked)
            ->orderBy('f.createdAt', 'DESC')
            ->setFirstResult(max(0, ($page - 1) * $perPage))
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();
    }

    public function countPendingReceived(User $user): int
    {
        return (int) $this->createQueryBuilder('f')
            ->select('COUNT(f.id)')
            ->andWhere('f.status = :pending')
            ->andWhere('f.receiver = :user')
            ->setParameter('pending', FriendshipStatus::Pending)
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
