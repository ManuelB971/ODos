<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\PushToken;
use App\Entity\User;
use App\Repository\PushTokenRepository;
use Doctrine\ORM\EntityManagerInterface;

final class PushTokenService
{
    public function __construct(
        private readonly PushTokenRepository $pushTokenRepository,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public function register(User $user, string $token, string $platform): PushToken
    {
        $token = trim($token);
        if ('' === $token) {
            throw new \InvalidArgumentException('Token invalide.');
        }

        $existing = $this->pushTokenRepository->findByToken($token);
        if ($existing instanceof PushToken) {
            $existing->setUser($user);
            $existing->setPlatform($platform);
            $existing->touch();
            $this->em->flush();

            return $existing;
        }

        $pushToken = new PushToken();
        $pushToken->setUser($user);
        $pushToken->setToken($token);
        $pushToken->setPlatform($platform);

        $this->em->persist($pushToken);
        $this->em->flush();

        return $pushToken;
    }

    public function unregister(User $user, string $token): void
    {
        $existing = $this->pushTokenRepository->findByToken(trim($token));
        if (!$existing instanceof PushToken || $existing->getUser()?->getId() !== $user->getId()) {
            return;
        }

        $this->em->remove($existing);
        $this->em->flush();
    }
}
