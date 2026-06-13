<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\RefreshToken;
use App\Entity\User;
use App\Repository\CommentRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

/**
 * Effacement RGPD (art. 17) : anonymisation des contenus publics, purge des tokens et logs.
 */
final class UserDeletionService
{
    public const ANONYMIZED_COMMENT_CONTENT = '[supprimé]';

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly CommentRepository $commentRepository,
        private readonly EmailPseudonymizer $emailPseudonymizer,
        private readonly LoggerInterface $logger,
        private readonly string $avatarUploadDir,
        private readonly string $avatarPublicPrefix,
    ) {
    }

    public function deleteUserAccount(User $user): void
    {
        $userId = (int) $user->getId();
        $email = $user->getEmail() ?? '';

        $this->purgeForumReplyLikes($user);
        $this->anonymizeForumReplies($user);
        $this->anonymizeForumThreads($user);
        $this->purgeSharedActivities($user);
        $this->purgeFriendships($user);
        $this->purgeGroupMemberships($user);
        $this->purgeGroupInvitations($user);
        $this->purgePushTokens($user);
        $this->purgeChatData($user);
        $this->handleOrphanGroups($user);
        $this->anonymizeAuthoredComments($user);
        $this->removeAvatarFile($user);
        $user->getFavorites()->clear();
        $this->purgeRefreshTokens($email);
        $this->purgeAdminAuditLogsForEmail($email);

        $this->em->remove($user);
        $this->em->flush();

        $this->logger->info('user.account_deleted', ['userId' => $userId]);
    }

    private function purgeForumReplyLikes(User $user): void
    {
        $this->em->createQueryBuilder()
            ->delete(\App\Entity\ForumReplyLike::class, 'l')
            ->where('l.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }

    private function anonymizeForumReplies(User $user): void
    {
        $this->em->createQueryBuilder()
            ->update(\App\Entity\ForumReply::class, 'r')
            ->set('r.author', 'NULL')
            ->where('r.author = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }

    private function anonymizeForumThreads(User $user): void
    {
        $this->em->createQueryBuilder()
            ->update(\App\Entity\ForumThread::class, 't')
            ->set('t.author', 'NULL')
            ->where('t.author = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }

    private function purgeSharedActivities(User $user): void
    {
        $this->em->createQueryBuilder()
            ->delete(\App\Entity\SharedActivity::class, 's')
            ->where('s.sender = :user OR s.receiver = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }

    private function purgeFriendships(User $user): void
    {
        $this->em->createQueryBuilder()
            ->delete(\App\Entity\Friendship::class, 'f')
            ->where('f.sender = :user OR f.receiver = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }

    private function purgeGroupMemberships(User $user): void
    {
        $this->em->createQueryBuilder()
            ->delete(\App\Entity\GroupMember::class, 'm')
            ->where('m.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }

    private function purgeGroupInvitations(User $user): void
    {
        $this->em->createQueryBuilder()
            ->delete(\App\Entity\GroupInvitation::class, 'i')
            ->where('i.invitee = :user OR i.invitedBy = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }

    private function purgePushTokens(User $user): void
    {
        $this->em->createQueryBuilder()
            ->delete(\App\Entity\PushToken::class, 't')
            ->where('t.user = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }

    private function purgeChatData(User $user): void
    {
        $this->em->createQueryBuilder()
            ->delete(\App\Entity\ChatMessage::class, 'm')
            ->where('m.author = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();

        $this->em->createQueryBuilder()
            ->delete(\App\Entity\Conversation::class, 'c')
            ->where('c.userOne = :user OR c.userTwo = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->execute();
    }

    private function handleOrphanGroups(User $user): void
    {
        $groups = $this->em->createQueryBuilder()
            ->select('g')
            ->from(\App\Entity\ActivityGroup::class, 'g')
            ->where('g.createdBy = :user')
            ->setParameter('user', $user)
            ->getQuery()
            ->getResult();

        foreach ($groups as $group) {
            $memberCount = (int) $this->em->createQueryBuilder()
                ->select('COUNT(m.id)')
                ->from(\App\Entity\GroupMember::class, 'm')
                ->where('m.group = :group')
                ->setParameter('group', $group)
                ->getQuery()
                ->getSingleScalarResult();

            if (0 === $memberCount) {
                $this->em->remove($group);
            }
        }
    }

    private function anonymizeAuthoredComments(User $user): void
    {
        $comments = $this->commentRepository->findBy(['author' => $user]);
        foreach ($comments as $comment) {
            $comment->setContent(self::ANONYMIZED_COMMENT_CONTENT);
            $comment->setAuthor(null);
            $comment->setIsHidden(true);
            $comment->setUpdatedAt(new \DateTimeImmutable());
        }
    }

    private function removeAvatarFile(User $user): void
    {
        $previous = $user->getAvatarUrl();
        if (!is_string($previous) || !str_starts_with($previous, $this->avatarPublicPrefix.'/')) {
            $user->setAvatarUrl(null);

            return;
        }

        $relative = substr($previous, strlen($this->avatarPublicPrefix.'/'));
        if ('' !== $relative && !str_contains($relative, '..') && !str_contains($relative, '/')) {
            $path = rtrim($this->avatarUploadDir, '/').'/'.$relative;
            if (is_file($path)) {
                @unlink($path);
            }
        }
        $user->setAvatarUrl(null);
    }

    private function purgeRefreshTokens(string $email): void
    {
        if ('' === $email) {
            return;
        }

        $this->em->createQueryBuilder()
            ->delete(RefreshToken::class, 'r')
            ->where('r.username = :email')
            ->setParameter('email', $email)
            ->getQuery()
            ->execute();
    }

    private function purgeAdminAuditLogsForEmail(string $email): void
    {
        if ('' === $email) {
            return;
        }

        $pseudo = $this->emailPseudonymizer->pseudonymize($email);
        $hash = $this->emailPseudonymizer->hash($email);

        $this->em->createQueryBuilder()
            ->delete()
            ->from(\App\Entity\AdminAuditLog::class, 'l')
            ->where('l.adminEmail = :email OR l.adminEmail = :pseudo')
            ->orWhere('l.context LIKE :hashNeedle')
            ->setParameter('email', $email)
            ->setParameter('pseudo', $pseudo)
            ->setParameter('hashNeedle', '%"adminEmailHash":"'.$hash.'"%')
            ->getQuery()
            ->execute();
    }
}
