<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ActivityGroup;
use App\Entity\GroupMember;
use App\Entity\GroupMessage;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<GroupMessage>
 */
class GroupMessageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GroupMessage::class);
    }

    /**
     * @return GroupMessage[]
     */
    public function findForGroupPaginated(ActivityGroup $group, int $page, int $perPage): array
    {
        return $this->createQueryBuilder('m')
            ->andWhere('m.group = :group')
            ->setParameter('group', $group)
            ->orderBy('m.createdAt', 'DESC')
            ->addOrderBy('m.id', 'DESC')
            ->setFirstResult(max(0, ($page - 1) * $perPage))
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();
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
     * Messages postés par d'autres membres depuis la dernière lecture du membre.
     */
    public function countUnreadForMember(GroupMember $member): int
    {
        $group = $member->getGroup();
        $user = $member->getUser();
        if (null === $group || null === $user) {
            return 0;
        }

        $qb = $this->createQueryBuilder('m')
            ->select('COUNT(m.id)')
            ->andWhere('m.group = :group')
            ->andWhere('m.author != :user')
            ->setParameter('group', $group)
            ->setParameter('user', $user);

        $last = $member->getLastReadGroupMessageAt();
        if (null !== $last) {
            $qb->andWhere('m.createdAt > :last')->setParameter('last', $last);
        }

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    /**
     * Total des messages de groupe non lus, tous groupes confondus, pour cet utilisateur.
     */
    public function countUnreadForUser(User $user): int
    {
        return (int) $this->createQueryBuilder('m')
            ->select('COUNT(m.id)')
            ->innerJoin(GroupMember::class, 'mem', 'WITH', 'mem.group = m.group AND mem.user = :user')
            ->andWhere('m.author != :user')
            ->andWhere('mem.lastReadGroupMessageAt IS NULL OR m.createdAt > mem.lastReadGroupMessageAt')
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
