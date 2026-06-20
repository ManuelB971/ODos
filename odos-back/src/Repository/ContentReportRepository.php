<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ContentReport;
use App\Entity\User;
use App\Enum\ContentReportTargetType;
use App\Enum\ForumReportStatus;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ContentReport>
 */
class ContentReportRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ContentReport::class);
    }

    public function findExisting(User $reporter, ContentReportTargetType $type, int $targetId): ?ContentReport
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
