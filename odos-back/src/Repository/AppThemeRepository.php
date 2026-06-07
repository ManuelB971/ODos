<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\AppTheme;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<AppTheme>
 */
class AppThemeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, AppTheme::class);
    }

    /** @return AppTheme[] */
    public function findActive(): array
    {
        return $this->findBy(['isActive' => true], ['sortOrder' => 'ASC', 'label' => 'ASC']);
    }
}
