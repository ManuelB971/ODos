<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\BadgeDefinition;
use App\Entity\User;
use App\Entity\UserBadge;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserBadge>
 */
class UserBadgeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserBadge::class);
    }

    public function findOneForUserAndBadge(User $user, BadgeDefinition $badge): ?UserBadge
    {
        return $this->findOneBy(['user' => $user, 'badge' => $badge]);
    }

    public function userOwnsBadge(User $user, BadgeDefinition $badge): bool
    {
        return null !== $this->findOneForUserAndBadge($user, $badge);
    }

    /**
     * @return UserBadge[]
     */
    public function findForUserOrdered(User $user): array
    {
        return $this->createQueryBuilder('ub')
            ->innerJoin('ub.badge', 'b')
            ->andWhere('ub.user = :user')
            ->setParameter('user', $user)
            ->orderBy('ub.unlockedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return int[]
     */
    public function findOwnedBadgeIds(User $user): array
    {
        $rows = $this->createQueryBuilder('ub')
            ->select('IDENTITY(ub.badge) AS badgeId')
            ->andWhere('ub.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getScalarResult();

        return array_map(static fn (array $r) => (int) $r['badgeId'], $rows);
    }

    /**
     * @return UserBadge[]
     */
    public function findUnseenForUser(User $user): array
    {
        return $this->createQueryBuilder('ub')
            ->andWhere('ub.user = :user')
            ->andWhere('ub.seenAt IS NULL')
            ->setParameter('user', $user)
            ->orderBy('ub.unlockedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
