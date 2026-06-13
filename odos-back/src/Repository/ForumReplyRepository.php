<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ForumReply;
use App\Entity\ForumThread;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ForumReply>
 */
class ForumReplyRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ForumReply::class);
    }

    /**
     * @return ForumReply[]
     */
    public function findForThreadPaginated(ForumThread $thread, int $page, int $perPage, bool $includeHidden): array
    {
        $qb = $this->createQueryBuilder('r')
            ->andWhere('r.thread = :thread')
            ->setParameter('thread', $thread)
            ->orderBy('r.createdAt', 'ASC')
            ->setFirstResult(max(0, ($page - 1) * $perPage))
            ->setMaxResults($perPage);

        if (!$includeHidden) {
            $qb->andWhere('r.isHidden = false');
        }

        return $qb->getQuery()->getResult();
    }

    public function countForThread(ForumThread $thread, bool $includeHidden): int
    {
        $qb = $this->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->andWhere('r.thread = :thread')
            ->setParameter('thread', $thread);

        if (!$includeHidden) {
            $qb->andWhere('r.isHidden = false');
        }

        return (int) $qb->getQuery()->getSingleScalarResult();
    }

    public function countByAuthor(User $user): int
    {
        return (int) $this->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->andWhere('r.author = :user')
            ->andWhere('r.isHidden = false')
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function findLatestForThread(ForumThread $thread): ?ForumReply
    {
        return $this->createQueryBuilder('r')
            ->andWhere('r.thread = :thread')
            ->andWhere('r.isHidden = false')
            ->setParameter('thread', $thread)
            ->orderBy('r.createdAt', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }

    public function findLatestForThreadExcluding(ForumThread $thread, int $excludeReplyId): ?ForumReply
    {
        return $this->createQueryBuilder('r')
            ->andWhere('r.thread = :thread')
            ->andWhere('r.id != :excludeId')
            ->andWhere('r.isHidden = false')
            ->setParameter('thread', $thread)
            ->setParameter('excludeId', $excludeReplyId)
            ->orderBy('r.createdAt', 'DESC')
            ->setMaxResults(1)
            ->getQuery()
            ->getOneOrNullResult();
    }
}
