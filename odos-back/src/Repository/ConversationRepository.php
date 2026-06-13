<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\Conversation;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Conversation>
 */
class ConversationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Conversation::class);
    }

    public function findBetweenUsers(User $a, User $b): ?Conversation
    {
        [$one, $two] = self::normalizePair($a, $b);

        return $this->findOneBy(['userOne' => $one, 'userTwo' => $two]);
    }

    /**
     * @return Conversation[]
     */
    public function findForUser(User $user, int $page, int $perPage): array
    {
        return $this->createQueryBuilder('c')
            ->andWhere('c.userOne = :user OR c.userTwo = :user')
            ->setParameter('user', $user)
            ->orderBy('c.lastMessageAt', 'DESC')
            ->addOrderBy('c.createdAt', 'DESC')
            ->setFirstResult(max(0, ($page - 1) * $perPage))
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();
    }

    /**
     * @return array{0: User, 1: User}
     */
    public static function normalizePair(User $a, User $b): array
    {
        $aId = (int) $a->getId();
        $bId = (int) $b->getId();

        return $aId < $bId ? [$a, $b] : [$b, $a];
    }
}
