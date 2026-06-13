<?php

declare(strict_types=1);

namespace App\Repository;

use App\Entity\ForumReply;
use App\Entity\ForumReplyLike;
use App\Entity\User;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ForumReplyLike>
 */
class ForumReplyLikeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ForumReplyLike::class);
    }

    public function findLike(User $user, ForumReply $reply): ?ForumReplyLike
    {
        return $this->findOneBy(['user' => $user, 'reply' => $reply]);
    }

    public function userHasLiked(User $user, ForumReply $reply): bool
    {
        return null !== $this->findLike($user, $reply);
    }

    /**
     * @param ForumReply[] $replies
     *
     * @return array<int, true> reply id => true
     */
    public function findLikedReplyIds(User $user, array $replies): array
    {
        if ([] === $replies) {
            return [];
        }

        $replyIds = array_values(array_filter(array_map(
            static fn (ForumReply $reply): ?int => $reply->getId(),
            $replies,
        )));

        if ([] === $replyIds) {
            return [];
        }

        $rows = $this->createQueryBuilder('l')
            ->select('IDENTITY(l.reply) AS replyId')
            ->andWhere('l.user = :user')
            ->andWhere('l.reply IN (:replyIds)')
            ->setParameter('user', $user)
            ->setParameter('replyIds', $replyIds)
            ->getQuery()
            ->getScalarResult();

        $liked = [];
        foreach ($rows as $row) {
            $liked[(int) $row['replyId']] = true;
        }

        return $liked;
    }
}
