<?php

declare(strict_types=1);

namespace App\Tests\Support;

use App\Repository\ChatMessageRepository;
use App\Repository\FriendshipRepository;
use App\Repository\GroupInvitationRepository;
use App\Repository\GroupMessageRepository;
use App\Repository\PushTokenRepository;
use App\Repository\SharedActivityRepository;
use App\Service\PushNotificationService;
use App\Service\SocialUnreadCountService;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

trait CreatesPushNotificationService
{
    private function createPushNotificationService(): PushNotificationService
    {
        // `SocialUnreadCountService` est `final` (non mockable par PHPUnit) : on en
        // construit une instance réelle avec des repositories mockés. Inoffensif ici,
        // car notifyUser() sort avant de l'utiliser quand l'utilisateur n'a pas de token.
        $socialUnreadCount = new SocialUnreadCountService(
            $this->createMock(FriendshipRepository::class),
            $this->createMock(GroupInvitationRepository::class),
            $this->createMock(ChatMessageRepository::class),
            $this->createMock(GroupMessageRepository::class),
            $this->createMock(SharedActivityRepository::class),
        );

        return new PushNotificationService(
            $this->createMock(PushTokenRepository::class),
            $this->createMock(HttpClientInterface::class),
            $this->createMock(LoggerInterface::class),
            $socialUnreadCount,
        );
    }
}
