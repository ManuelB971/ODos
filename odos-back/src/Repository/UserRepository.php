<?php

namespace App\Repository;

use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\Exception\UnsupportedUserException;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\PasswordUpgraderInterface;

/**
 * @extends ServiceEntityRepository<User>
 */
class UserRepository extends ServiceEntityRepository implements PasswordUpgraderInterface
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, User::class);
    }

    /**
     * Used to upgrade (rehash) the user's password automatically over time.
     */
    public function upgradePassword(PasswordAuthenticatedUserInterface $user, string $newHashedPassword): void
    {
        if (!$user instanceof User) {
            throw new UnsupportedUserException(sprintf('Instances of "%s" are not supported.', $user::class));
        }

        $user->setPassword($newHashedPassword);
        $this->getEntityManager()->persist($user);
        $this->getEntityManager()->flush();
    }

    /**
     * @return User[]
     */
    public function searchDiscoverable(User $viewer, string $query, int $page, int $perPage): array
    {
        $needle = '%'.mb_strtolower($query).'%';

        // Matche le nom affiché : l'alias s'il existe, sinon la partie locale de
        // l'e-mail (qui sert justement de displayName quand l'alias est absent).
        return $this->createQueryBuilder('u')
            ->andWhere('u.id != :viewer')
            ->andWhere('u.profilePublic = true')
            ->andWhere('u.socialConsentedAt IS NOT NULL')
            ->andWhere("LOWER(u.alias) LIKE :q OR (u.alias IS NULL AND LOWER(SUBSTRING(u.email, 1, LOCATE('@', u.email) - 1)) LIKE :q)")
            ->setParameter('viewer', $viewer)
            ->setParameter('q', $needle)
            ->orderBy('u.alias', 'ASC')
            ->addOrderBy('u.email', 'ASC')
            ->setFirstResult(max(0, ($page - 1) * $perPage))
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();
    }

    /**
     * Recherche d'unicité d'alias insensible à la casse (utilisée par UniqueEntity).
     *
     * @param array{alias?: string|null} $criteria
     *
     * @return User[]
     */
    public function findForUniqueAlias(array $criteria): array
    {
        $alias = $criteria['alias'] ?? null;
        if (null === $alias || '' === $alias) {
            return [];
        }

        return $this->createQueryBuilder('u')
            ->andWhere('LOWER(u.alias) = LOWER(:alias)')
            ->setParameter('alias', $alias)
            ->getQuery()
            ->getResult();
    }

    /**
     * Comptes sans alias public — utilisé par la commande de backfill.
     *
     * @return User[]
     */
    public function findWithoutAlias(): array
    {
        return $this->createQueryBuilder('u')
            ->andWhere('u.alias IS NULL OR u.alias = :empty')
            ->setParameter('empty', '')
            ->orderBy('u.id', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
