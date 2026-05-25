<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\BadgeDefinition;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<BadgeDefinition>
 */
class BadgeDefinitionRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, BadgeDefinition::class);
    }

    /**
     * @return BadgeDefinition[]
     */
    public function findActiveOrdered(): array
    {
        return $this->createQueryBuilder('b')
            ->andWhere('b.isActive = :active')
            ->setParameter('active', true)
            ->orderBy('b.sortOrder', 'ASC')
            ->addOrderBy('b.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    /**
     * @return BadgeDefinition[]
     */
    public function findAutoAwardCandidates(): array
    {
        return $this->createQueryBuilder('b')
            ->andWhere('b.isActive = :active')
            ->andWhere('b.ruleType != :manual')
            ->andWhere('b.ruleType != :custom')
            ->andWhere('b.ruleType != :map')
            ->setParameter('active', true)
            ->setParameter('manual', \App\Enum\BadgeRuleType::Manual)
            ->setParameter('custom', \App\Enum\BadgeRuleType::Custom)
            ->setParameter('map', \App\Enum\BadgeRuleType::MapCells)
            ->getQuery()
            ->getResult();
    }
}
