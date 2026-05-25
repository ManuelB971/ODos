<?php

namespace App\Repository;

use App\Entity\Activity;
use App\Entity\Comment;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Comment>
 */
class CommentRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Comment::class);
    }

    /**
     * @return Comment[]
     */
    public function findVisibleForActivityPaginated(Activity $activity, int $page, int $perPage, bool $includeHiddenForAdmin): array
    {
        $qb = $this->createQueryBuilder('c')
            ->andWhere('c.activity = :activity')
            ->setParameter('activity', $activity)
            ->orderBy('c.createdAt', 'DESC')
            ->setFirstResult(max(0, ($page - 1) * $perPage))
            ->setMaxResults($perPage);

        if (!$includeHiddenForAdmin) {
            $qb->andWhere('c.isHidden = false');
        }

        return $qb->getQuery()->getResult();
    }

    public function countVisibleForActivity(Activity $activity, bool $includeHiddenForAdmin): int
    {
        $qb = $this->createQueryBuilder('c')
            ->select('COUNT(c.id)')
            ->andWhere('c.activity = :activity')
            ->setParameter('activity', $activity);

        if (!$includeHiddenForAdmin) {
            $qb->andWhere('c.isHidden = false');
        }

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    public function countVisibleByAuthor(User $user): int
    {
        return (int) $this->createQueryBuilder('c')
            ->select('COUNT(c.id)')
            ->andWhere('c.author = :user')
            ->andWhere('c.isHidden = false')
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
