<?php

namespace App\Repository;

use App\Entity\Activity;
use App\Entity\ActivityRating;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ActivityRating>
 */
class ActivityRatingRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ActivityRating::class);
    }

    public function findOneByUserAndActivity(User $user, Activity $activity): ?ActivityRating
    {
        return $this->findOneBy(['user' => $user, 'activity' => $activity]);
    }

    /**
     * Recompute denormalized aggregates on Activity from persisted ratings.
     */
    public function refreshActivityAggregates(Activity $activity): void
    {
        $em = $this->getEntityManager();
        $row = $this->createQueryBuilder('r')
            ->select('COUNT(r.id) AS cnt', 'AVG(r.score) AS avgScore')
            ->where('r.activity = :activity')
            ->setParameter('activity', $activity)
            ->getQuery()
            ->getSingleResult();

        $count = (int) ($row['cnt'] ?? 0);
        $avgScore = $row['avgScore'] ?? null;
        $avg = is_numeric($avgScore) ? round((float) $avgScore, 2) : null;

        $activity->setRatingCount($count);
        $activity->setRatingAverage($count > 0 ? $avg : null);
        $em->persist($activity);
    }
}
