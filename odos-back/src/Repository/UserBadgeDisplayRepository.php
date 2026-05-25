<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\BadgeDefinition;
use App\Entity\User;
use App\Entity\UserBadgeDisplay;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<UserBadgeDisplay>
 */
class UserBadgeDisplayRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, UserBadgeDisplay::class);
    }

    public function findOneForUserAndBadge(User $user, BadgeDefinition $badge): ?UserBadgeDisplay
    {
        return $this->findOneBy(['user' => $user, 'badge' => $badge]);
    }
}
