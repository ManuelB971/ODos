<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ActivityGroup;
use App\Entity\GroupInvitation;
use App\Entity\User;
use App\Enum\GroupInvitationStatus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<GroupInvitation>
 */
class GroupInvitationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GroupInvitation::class);
    }

    public function findPendingForUserAndGroup(User $user, ActivityGroup $group): ?GroupInvitation
    {
        return $this->findOneBy([
            'invitee' => $user,
            'group' => $group,
            'status' => GroupInvitationStatus::Pending,
        ]);
    }

    public function findForUserAndGroup(User $user, ActivityGroup $group): ?GroupInvitation
    {
        return $this->findOneBy([
            'invitee' => $user,
            'group' => $group,
        ]);
    }

    /**
     * @return GroupInvitation[]
     */
    public function findPendingForUser(User $user, int $page, int $perPage): array
    {
        return $this->createQueryBuilder('i')
            ->andWhere('i.invitee = :user')
            ->andWhere('i.status = :pending')
            ->setParameter('user', $user)
            ->setParameter('pending', GroupInvitationStatus::Pending)
            ->orderBy('i.createdAt', 'DESC')
            ->setFirstResult(max(0, ($page - 1) * $perPage))
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();
    }

    public function countPendingForUser(User $user): int
    {
        return (int) $this->createQueryBuilder('i')
            ->select('COUNT(i.id)')
            ->andWhere('i.invitee = :user')
            ->andWhere('i.status = :pending')
            ->setParameter('user', $user)
            ->setParameter('pending', GroupInvitationStatus::Pending)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
