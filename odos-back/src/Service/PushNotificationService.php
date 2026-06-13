<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Repository\PushTokenRepository;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class PushNotificationService
{
    public function __construct(
        private readonly PushTokenRepository $pushTokenRepository,
        private readonly HttpClientInterface $httpClient,
        private readonly LoggerInterface $logger,
    ) {
    }

    /**
     * @param array<string, mixed> $data
     */
    public function notifyUser(User $user, string $title, string $body, array $data = []): void
    {
        $tokens = $this->pushTokenRepository->findTokensForUser($user);
        if ([] === $tokens) {
            return;
        }

        $messages = array_map(
            static fn (string $token): array => [
                'to' => $token,
                'title' => $title,
                'body' => $body,
                'data' => $data,
                'sound' => 'default',
            ],
            $tokens,
        );

        try {
            $this->httpClient->request('POST', 'https://exp.host/--/api/v2/push/send', [
                'json' => $messages,
                'headers' => [
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ],
                'timeout' => 5,
            ]);
        } catch (\Throwable $e) {
            $this->logger->warning('push.notification_failed', [
                'userId' => $user->getId(),
                'error' => $e->getMessage(),
            ]);
        }
    }
}
