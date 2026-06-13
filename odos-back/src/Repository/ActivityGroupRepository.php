<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ActivityGroup;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ActivityGroup>
 */
class ActivityGroupRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ActivityGroup::class);
    }

    /**
     * @return ActivityGroup[]
     */
    public function findPublicDiscovery(int $page, int $perPage): array
    {
        return $this->createQueryBuilder('g')
            ->andWhere('g.isPrivate = false')
            ->orderBy('g.memberCount', 'DESC')
            ->addOrderBy('g.createdAt', 'DESC')
            ->setFirstResult(max(0, ($page - 1) * $perPage))
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();
    }

    public function countPublicDiscovery(): int
    {
        return (int) $this->createQueryBuilder('g')
            ->select('COUNT(g.id)')
            ->andWhere('g.isPrivate = false')
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * @return ActivityGroup[]
     */
    public function findByMember(User $user, int $page, int $perPage): array
    {
        return $this->createQueryBuilder('g')
            ->innerJoin('App\Entity\GroupMember', 'm', 'WITH', 'm.group = g')
            ->andWhere('m.user = :user')
            ->setParameter('user', $user)
            ->orderBy('g.name', 'ASC')
            ->setFirstResult(max(0, ($page - 1) * $perPage))
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();
    }
}
