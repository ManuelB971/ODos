<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ChatMessage;
use App\Entity\Conversation;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ChatMessage>
 */
class ChatMessageRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ChatMessage::class);
    }

    /**
     * @return ChatMessage[]
     */
    public function findForConversationPaginated(Conversation $conversation, int $page, int $perPage): array
    {
        return $this->createQueryBuilder('m')
            ->andWhere('m.conversation = :conversation')
            ->setParameter('conversation', $conversation)
            ->orderBy('m.createdAt', 'DESC')
            ->setFirstResult(max(0, ($page - 1) * $perPage))
            ->setMaxResults($perPage)
            ->getQuery()
            ->getResult();
    }

    public function countForConversation(Conversation $conversation): int
    {
        return (int) $this->createQueryBuilder('m')
            ->select('COUNT(m.id)')
            ->andWhere('m.conversation = :conversation')
            ->setParameter('conversation', $conversation)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function countUnreadForUser(User $user): int
    {
        return (int) $this->createQueryBuilder('m')
            ->select('COUNT(m.id)')
            ->innerJoin('m.conversation', 'c')
            ->andWhere('c.userOne = :user OR c.userTwo = :user')
            ->andWhere('m.author != :user')
            ->andWhere('m.readAt IS NULL')
            ->setParameter('user', $user)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function countUnreadInConversation(Conversation $conversation, User $viewer): int
    {
        return (int) $this->createQueryBuilder('m')
            ->select('COUNT(m.id)')
            ->andWhere('m.conversation = :conversation')
            ->andWhere('m.author != :viewer')
            ->andWhere('m.readAt IS NULL')
            ->setParameter('conversation', $conversation)
            ->setParameter('viewer', $viewer)
            ->getQuery()
            ->getSingleScalarResult();
    }

    public function markConversationRead(Conversation $conversation, User $viewer): int
    {
        return $this->getEntityManager()->createQueryBuilder()
            ->update(ChatMessage::class, 'm')
            ->set('m.readAt', ':now')
            ->andWhere('m.conversation = :conversation')
            ->andWhere('m.author != :viewer')
            ->andWhere('m.readAt IS NULL')
            ->setParameter('now', new \DateTimeImmutable())
            ->setParameter('conversation', $conversation)
            ->setParameter('viewer', $viewer)
            ->getQuery()
            ->execute();
    }
}
