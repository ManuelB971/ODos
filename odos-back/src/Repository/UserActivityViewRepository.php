<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Activity;
use App\Entity\User;
use App\Entity\UserActivityView;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserActivityView>
 */
class UserActivityViewRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserActivityView::class);
    }

    public function countForUser(User $user): int
    {
        return (int) $this->createQueryBuilder('v')
            ->select('COUNT(v.id)')
            ->andWhere('v.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function countForUserInCategory(User $user, int $categoryId): int
    {
        return (int) $this->createQueryBuilder('v')
            ->select('COUNT(v.id)')
            ->innerJoin('v.activity', 'a')
            ->andWhere('v.user = :user')
            ->andWhere('IDENTITY(a.category) = :categoryId')
            ->setParameter('user', $user)
            ->setParameter('categoryId', $categoryId)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function recordView(User $user, Activity $activity): UserActivityView
    {
        $existing = $this->findOneBy(['user' => $user, 'activity' => $activity]);
        if ($existing instanceof UserActivityView) {
            $existing->touch();

            return $existing;
        }

        $view = new UserActivityView();
        $view->setUser($user);
        $view->setActivity($activity);

        return $view;
    }
}
