<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\PushTokenRepository;
use App\Service\PushNotificationService;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

trait CreatesPushNotificationService
{
    private function createPushNotificationService(): PushNotificationService
    {
        return new PushNotificationService(
            $this->createMock(PushTokenRepository::class),
            $this->createMock(HttpClientInterface::class),
            $this->createMock(LoggerInterface::class),
        );
    }
}
