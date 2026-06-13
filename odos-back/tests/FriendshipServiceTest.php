<?php

declare(strict_types=1);

namespace App\Tests;

use App\Entity\Friendship;
use App\Entity\User;
use App\Enum\FriendshipStatus;
use App\Repository\FriendshipRepository;
use App\Service\FriendshipService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

final class FriendshipServiceTest extends TestCase
{
    private function createService(?Friendship $existing = null): FriendshipService
    {
        $repo = $this->createMock(FriendshipRepository::class);
        $repo->method('findBetweenUsers')->willReturn($existing);

        $em = $this->createMock(EntityManagerInterface::class);

        return new FriendshipService($repo, $em);
    }

    public function testCannotSendRequestToSelf(): void
    {
        $user = new User();
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, 1);

        $service = $this->createService();
        self::assertFalse($service->canSendRequest($user, $user));
    }

    public function testCannotSendDuplicateRequest(): void
    {
        $a = new User();
        $b = new User();
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($a, 1);
        $ref->setValue($b, 2);

        $existing = new Friendship();
        $existing->setSender($a);
        $existing->setReceiver($b);
        $existing->setStatus(FriendshipStatus::Pending);

        $service = $this->createService($existing);
        self::assertFalse($service->canSendRequest($a, $b));
    }

    public function testCannotSendRequestToBlockedUser(): void
    {
        $a = new User();
        $b = new User();
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($a, 1);
        $ref->setValue($b, 2);

        $blocked = new Friendship();
        $blocked->setSender($b);
        $blocked->setReceiver($a);
        $blocked->setStatus(FriendshipStatus::Blocked);

        $service = $this->createService($blocked);
        self::assertFalse($service->canSendRequest($a, $b));
    }

    public function testAreFriendsBidirectional(): void
    {
        $a = new User();
        $b = new User();

        $friendship = new Friendship();
        $friendship->setSender($a);
        $friendship->setReceiver($b);
        $friendship->setStatus(FriendshipStatus::Accepted);

        $service = $this->createService($friendship);
        self::assertTrue($service->areFriends($a, $b));
        self::assertTrue($service->areFriends($b, $a));
    }

    public function testCannotAcceptNonPendingRequest(): void
    {
        $friendship = new Friendship();
        $friendship->setStatus(FriendshipStatus::Blocked);

        $service = $this->createService();
        $this->expectException(\InvalidArgumentException::class);
        $service->acceptRequest($friendship);
    }
}
