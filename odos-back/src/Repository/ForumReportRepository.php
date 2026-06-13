<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ForumReport;
use App\Entity\User;
use App\Enum\ForumReportStatus;
use App\Enum\ForumReportTargetType;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ForumReport>
 */
class ForumReportRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ForumReport::class);
    }

    public function findExisting(User $reporter, ForumReportTargetType $type, int $targetId): ?ForumReport
    {
        return $this->findOneBy([
            'reporter' => $reporter,
            'targetType' => $type,
            'targetId' => $targetId,
        ]);
    }

    public function countPending(): int
    {
        return (int) $this->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->andWhere('r.status = :pending')
            ->setParameter('pending', ForumReportStatus::Pending)
            ->getQuery()
            ->getSingleScalarResult();
    }
}
