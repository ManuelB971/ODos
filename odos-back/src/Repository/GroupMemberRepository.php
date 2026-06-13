<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ActivityGroup;
use App\Entity\GroupMember;
use App\Entity\User;
use App\Enum\GroupRole;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<GroupMember>
 */
class GroupMemberRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GroupMember::class);
    }

    public function findMembership(User $user, ActivityGroup $group): ?GroupMember
    {
        return $this->findOneBy(['user' => $user, 'group' => $group]);
    }

    public function countForUser(User $user): int
    {
        return (int) $this->createQueryBuilder('m')
            ->select('COUNT(m.id)')
            ->andWhere('m.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function countForGroup(ActivityGroup $group): int
    {
        return (int) $this->createQueryBuilder('m')
            ->select('COUNT(m.id)')
            ->andWhere('m.group = :group')
            ->setParameter('group', $group)
            ->getQuery()
            ->getSingleScalarResult();
    }

    /**
     * @return GroupMember[]
     */
    public function findForGroup(ActivityGroup $group): array
    {
        $members = $this->createQueryBuilder('m')
            ->andWhere('m.group = :group')
            ->setParameter('group', $group)
            ->orderBy('m.joinedAt', 'ASC')
            ->getQuery()
            ->getResult();

        usort(
            $members,
            static fn (GroupMember $a, GroupMember $b): int => $b->getRole()->rank() <=> $a->getRole()->rank()
                ?: $a->getJoinedAt() <=> $b->getJoinedAt(),
        );

        return $members;
    }

    public function findCreator(ActivityGroup $group): ?GroupMember
    {
        return $this->findOneBy(['group' => $group, 'role' => GroupRole::Creator]);
    }
}
