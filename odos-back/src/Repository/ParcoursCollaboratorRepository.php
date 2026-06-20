<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Parcours;
use App\Entity\ParcoursCollaborator;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ParcoursCollaborator>
 */
class ParcoursCollaboratorRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ParcoursCollaborator::class);
    }

    public function findCollaborator(Parcours $parcours, User $user): ?ParcoursCollaborator
    {
        return $this->findOneBy(['parcours' => $parcours, 'user' => $user]);
    }

    public function exists(Parcours $parcours, User $user): bool
    {
        return null !== $this->findOneBy(['parcours' => $parcours, 'user' => $user]);
    }

    /**
     * @return ParcoursCollaborator[]
     */
    public function findForParcours(Parcours $parcours): array
    {
        return $this->findBy(['parcours' => $parcours], ['addedAt' => 'ASC']);
    }

    /**
     * Collaborations « croisées » entre deux utilisateurs : un parcours de l'un
     * où l'autre co-édite, dans les deux sens. Sert à révoquer la co-édition
     * mutuelle lors d'un blocage (les étapes déjà ajoutées restent en place).
     *
     * @return ParcoursCollaborator[]
     */
    public function findCollaborationsBetween(User $a, User $b): array
    {
        return $this->createQueryBuilder('c')
            ->join('c.parcours', 'p')
            ->where('(p.owner = :a AND c.user = :b) OR (p.owner = :b AND c.user = :a)')
            ->setParameter('a', $a)
            ->setParameter('b', $b)
            ->getQuery()
            ->getResult();
    }
}
