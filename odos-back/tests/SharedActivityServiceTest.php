<?php

declare(strict_types=1);

namespace App\Tests;

use App\Entity\Activity;
use App\Entity\ActivityGroup;
use App\Entity\Friendship;
use App\Entity\GroupMember;
use App\Entity\User;
use App\Enum\FriendshipStatus;
use App\Repository\ConversationRepository;
use App\Repository\FriendshipRepository;
use App\Repository\GroupInvitationRepository;
use App\Repository\GroupMemberRepository;
use App\Repository\SharedActivityRepository;
use App\Service\CommentContentSanitizer;
use App\Service\FriendshipService;
use App\Service\GroupService;
use App\Service\SharedActivityService;
use App\Tests\Support\CreatesPushNotificationService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

final class SharedActivityServiceTest extends TestCase
{
    use CreatesPushNotificationService;
    private function createService(?Friendship $friendship = null, ?GroupMember $membership = null): SharedActivityService
    {
        $friendshipRepo = $this->createMock(FriendshipRepository::class);
        $friendshipRepo->method('findBetweenUsers')->willReturn($friendship);

        $memberRepo = $this->createMock(GroupMemberRepository::class);
        $memberRepo->method('findMembership')->willReturn($membership);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist');
        $em->method('flush');

        return new SharedActivityService(
            new FriendshipService($friendshipRepo, $this->createMock(ConversationRepository::class), $em),
            new GroupService(
                $memberRepo,
                $this->createMock(GroupInvitationRepository::class),
                $em,
                new CommentContentSanitizer(),
                $this->createMock(EventDispatcherInterface::class),
                $this->createPushNotificationService(),
            ),
            new CommentContentSanitizer(),
            $em,
            $this->createMock(SharedActivityRepository::class),
            $this->createPushNotificationService(),
        );
    }

    private function user(int $id): User
    {
        $user = new User();
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, $id);

        return $user;
    }

    public function testCannotShareToNonFriend(): void
    {
        $service = $this->createService();
        $this->expectException(\InvalidArgumentException::class);
        $service->share($this->user(1), new Activity(), $this->user(2), null, 'Salut');
    }

    public function testCannotShareToBlockedUser(): void
    {
        $blocked = new Friendship();
        $blocked->setSender($this->user(2));
        $blocked->setReceiver($this->user(1));
        $blocked->setStatus(FriendshipStatus::Blocked);

        $service = $this->createService($blocked);
        $this->expectException(\InvalidArgumentException::class);
        $service->share($this->user(1), new Activity(), $this->user(2), null, null);
    }

    public function testMessageIsSanitized(): void
    {
        $friendship = new Friendship();
        $friendship->setSender($this->user(1));
        $friendship->setReceiver($this->user(2));
        $friendship->setStatus(FriendshipStatus::Accepted);

        $service = $this->createService($friendship);
        $shared = $service->share($this->user(1), new Activity(), $this->user(2), null, '  <b>Hello</b>  ');
        self::assertSame('Hello', $shared->getMessage());
    }

    public function testCanShareToGroupAsMember(): void
    {
        $membership = new GroupMember();
        $service = $this->createService(null, $membership);
        $shared = $service->share($this->user(1), new Activity(), null, new ActivityGroup(), 'Groupe!');
        self::assertSame('Groupe!', $shared->getMessage());
    }
}
