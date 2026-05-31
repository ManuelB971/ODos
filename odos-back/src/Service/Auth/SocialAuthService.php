<?php

declare(strict_types=1);

namespace App\Service\Auth;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\JwtAuthResponseFactory;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class SocialAuthService
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $passwordHasher,
        private readonly JwtAuthResponseFactory $jwtAuthResponseFactory,
        private readonly GoogleIdTokenVerifier $googleVerifier,
        private readonly AppleIdTokenVerifier $appleVerifier,
    ) {
    }

    /**
     * @return array{token: string, refresh_token: string}
     */
    public function authenticateGoogle(string $idToken): array
    {
        $payload = $this->googleVerifier->verify($idToken);

        return $this->jwtAuthResponseFactory->create(
            $this->resolveUser(
                provider: 'google',
                providerId: $payload['sub'],
                email: $payload['email'],
                displayName: $payload['name'] ?? null,
            )
        );
    }

    /**
     * @return array{token: string, refresh_token: string}
     */
    public function authenticateApple(string $identityToken, ?string $fallbackEmail = null): array
    {
        $payload = $this->appleVerifier->verify($identityToken);
        $email = $payload['email'] ?? $fallbackEmail;

        if (null === $email || '' === trim($email)) {
            throw new \InvalidArgumentException(
                'Email Apple indisponible. Réessayez ou utilisez la connexion email.'
            );
        }

        return $this->jwtAuthResponseFactory->create(
            $this->resolveUser(
                provider: 'apple',
                providerId: $payload['sub'],
                email: strtolower(trim($email)),
                displayName: null,
            )
        );
    }

    private function resolveUser(
        string $provider,
        string $providerId,
        string $email,
        ?string $displayName,
    ): User {
        $user = 'google' === $provider
            ? $this->userRepository->findOneBy(['googleId' => $providerId])
            : $this->userRepository->findOneBy(['appleId' => $providerId]);

        if (null === $user) {
            $user = $this->userRepository->findOneBy(['email' => $email]);
        }

        if (null === $user) {
            $user = new User();
            $user->setEmail($email);
            $user->setConsentedAt(new \DateTimeImmutable());
            if (null !== $displayName && '' !== trim($displayName)) {
                $user->setAlias(trim($displayName));
            }
            $user->setPassword(
                $this->passwordHasher->hashPassword($user, bin2hex(random_bytes(32)))
            );
            $this->em->persist($user);
        }

        if ('google' === $provider) {
            $user->setGoogleId($providerId);
        } else {
            $user->setAppleId($providerId);
        }

        if (null === $user->getConsentedAt()) {
            $user->setConsentedAt(new \DateTimeImmutable());
        }

        $this->em->flush();

        return $user;
    }
}
