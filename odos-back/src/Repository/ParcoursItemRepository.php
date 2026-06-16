<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Parcours;
use App\Entity\ParcoursItem;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ParcoursItem>
 */
class ParcoursItemRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ParcoursItem::class);
    }

    /**
     * Étapes ordonnées d'un parcours.
     *
     * @return ParcoursItem[]
     */
    public function findOrdered(Parcours $parcours): array
    {
        return $this->createQueryBuilder('i')
            ->andWhere('i.parcours = :parcours')
            ->setParameter('parcours', $parcours)
            ->orderBy('i.position', 'ASC')
            ->addOrderBy('i.id', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function maxPosition(Parcours $parcours): int
    {
        $max = $this->createQueryBuilder('i')
            ->select('MAX(i.position)')
            ->andWhere('i.parcours = :parcours')
            ->setParameter('parcours', $parcours)
            ->getQuery()
            ->getSingleScalarResult();

        return null === $max ? -1 : (int) $max;
    }
}
