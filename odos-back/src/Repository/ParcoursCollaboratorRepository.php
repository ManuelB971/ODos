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
}
