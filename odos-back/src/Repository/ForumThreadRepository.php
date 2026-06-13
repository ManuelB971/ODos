<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Activity;
use App\Entity\ActivityGroup;
use App\Entity\Category;
use App\Entity\ForumThread;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ForumThread>
 */
class ForumThreadRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ForumThread::class);
    }

    /**
     * @return ForumThread[]
     */
    public function findPaginated(
        int $page,
        int $perPage,
        ?Activity $activity = null,
        ?Category $category = null,
        ?ActivityGroup $group = null,
    ): array {
        $qb = $this->createQueryBuilder('t')
            ->orderBy('t.isPinned', 'DESC')
            ->addOrderBy('t.lastReplyAt', 'DESC')
            ->addOrderBy('t.createdAt', 'DESC')
            ->setFirstResult(max(0, ($page - 1) * $perPage))
            ->setMaxResults($perPage);

        if (null !== $activity) {
            $qb->andWhere('t.activity = :activity')->setParameter('activity', $activity);
        }
        if (null !== $category) {
            $qb->andWhere('t.category = :category')->setParameter('category', $category);
        }
        if (null !== $group) {
            $qb->andWhere('t.group = :group')->setParameter('group', $group);
        }

        return $qb->getQuery()->getResult();
    }

    public function countFiltered(
        ?Activity $activity = null,
        ?Category $category = null,
        ?ActivityGroup $group = null,
    ): int {
        $qb = $this->createQueryBuilder('t')->select('COUNT(t.id)');

        if (null !== $activity) {
            $qb->andWhere('t.activity = :activity')->setParameter('activity', $activity);
        }
        if (null !== $category) {
            $qb->andWhere('t.category = :category')->setParameter('category', $category);
        }
        if (null !== $group) {
            $qb->andWhere('t.group = :group')->setParameter('group', $group);
        }

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    public function countByAuthor(User $user): int
    {
        return (int) $this->createQueryBuilder('t')
            ->select('COUNT(t.id)')
            ->andWhere('t.author = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
