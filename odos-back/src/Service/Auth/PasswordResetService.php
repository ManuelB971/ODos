<?php

declare(strict_types=1);

namespace App\Service\Auth;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class PasswordResetService
{
    private const TOKEN_TTL = '+1 hour';
    private const MIN_PASSWORD_LENGTH = 6;

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly MailerInterface $mailer,
        private readonly LoggerInterface $logger,
        private readonly string $mailerFrom,
        private readonly string $mobileAppScheme,
        private readonly bool $debugMode,
    ) {
    }

    /**
     * Demande de réinitialisation — réponse identique que l'email existe ou non (anti-énumération).
     */
    public function requestReset(string $email): void
    {
        $normalized = strtolower(trim($email));
        if ('' === $normalized) {
            return;
        }

        $user = $this->userRepository->findOneBy(['email' => $normalized]);
        if (!$user instanceof User) {
            return;
        }

        $token = bin2hex(random_bytes(32));
        $user->setPasswordResetTokenHash($this->hashToken($token));
        $user->setPasswordResetExpiresAt(new \DateTimeImmutable(self::TOKEN_TTL));
        $this->em->flush();

        $this->sendResetEmail($normalized, $token);

        if ($this->debugMode) {
            $this->logger->info('Password reset token (dev only)', [
                'email' => $normalized,
                'deepLink' => $this->buildDeepLink($token),
            ]);
        }
    }

    public function confirmReset(string $token, string $password): void
    {
        $token = trim($token);
        if ('' === $token) {
            throw new \InvalidArgumentException('Code de réinitialisation invalide.');
        }

        if (strlen($password) < self::MIN_PASSWORD_LENGTH) {
            throw new \InvalidArgumentException(
                sprintf('Le mot de passe doit contenir au moins %d caractères.', self::MIN_PASSWORD_LENGTH)
            );
        }

        $user = $this->userRepository->findOneBy([
            'passwordResetTokenHash' => $this->hashToken($token),
        ]);

        if (!$user instanceof User) {
            throw new \InvalidArgumentException('Code invalide ou expiré.');
        }

        $expiresAt = $user->getPasswordResetExpiresAt();
        if (null === $expiresAt || $expiresAt < new \DateTimeImmutable()) {
            $this->clearResetState($user);
            $this->em->flush();
            throw new \InvalidArgumentException('Code invalide ou expiré.');
        }

        $user->setPassword($this->passwordHasher->hashPassword($user, $password));
        $this->clearResetState($user);
        $this->em->flush();
    }

    private function sendResetEmail(string $email, string $token): void
    {
        $deepLink = $this->buildDeepLink($token);

        $message = (new Email())
            ->from($this->mailerFrom)
            ->to($email)
            ->subject('ODos — Réinitialisation de mot de passe')
            ->text(
                <<<BODY
Bonjour,

Vous avez demandé à réinitialiser votre mot de passe ODos.

Ouvrez ce lien dans l'application :
{$deepLink}

Ou saisissez ce code dans l'écran « Nouveau mot de passe » :
{$token}

Ce code expire dans 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.

— L'équipe ODos
BODY
            );

        try {
            $this->mailer->send($message);
        } catch (\Throwable $e) {
            $this->logger->error('Impossible d\'envoyer l\'email de réinitialisation.', [
                'email' => $email,
                'error' => $e->getMessage(),
            ]);

            if ($this->debugMode) {
                return;
            }

            throw new \RuntimeException('Envoi d\'email temporairement indisponible.');
        }
    }

    private function buildDeepLink(string $token): string
    {
        return sprintf(
            '%s://reset-password?token=%s',
            $this->mobileAppScheme,
            rawurlencode($token)
        );
    }

    private function hashToken(string $token): string
    {
        return hash('sha256', $token);
    }

    private function clearResetState(User $user): void
    {
        $user->setPasswordResetTokenHash(null);
        $user->setPasswordResetExpiresAt(null);
    }
}
