<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Parcours;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Parcours>
 */
class ParcoursRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Parcours::class);
    }

    /**
     * Parcours visibles par l'utilisateur : ceux qu'il possède + ceux où il est
     * collaborateur. Triés par activité récente.
     *
     * @return Parcours[]
     */
    public function findForUser(User $user): array
    {
        return $this->createQueryBuilder('p')
            ->leftJoin('App\Entity\ParcoursCollaborator', 'c', 'WITH', 'c.parcours = p AND c.user = :user')
            ->andWhere('p.owner = :user OR c.id IS NOT NULL')
            ->setParameter('user', $user)
            ->orderBy('p.updatedAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
