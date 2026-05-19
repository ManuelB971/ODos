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

        $this->anonymizeAuthoredComments($user);
        $this->removeAvatarFile($user);
        $user->getFavorites()->clear();
        $this->purgeRefreshTokens($email);
        $this->purgeAdminAuditLogsForEmail($email);

        $this->em->remove($user);
        $this->em->flush();

        $this->logger->info('user.account_deleted', ['userId' => $userId]);
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
