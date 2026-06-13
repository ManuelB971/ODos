<?php

declare(strict_types=1);

namespace App\Tests;

use App\Entity\ActivityGroup;
use App\Entity\ForumReply;
use App\Entity\ForumThread;
use App\Entity\User;
use App\Repository\FriendshipRepository;
use App\Repository\GroupInvitationRepository;
use App\Repository\GroupMemberRepository;
use App\Service\CommentContentSanitizer;
use App\Service\ForumModerationService;
use App\Service\FriendshipService;
use App\Service\GroupService;
use App\Tests\Support\CreatesPushNotificationService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

final class ForumModerationServiceTest extends TestCase
{
    use CreatesPushNotificationService;
    public function testCannotAccessPrivateGroupThread(): void
    {
        $memberRepo = $this->createMock(GroupMemberRepository::class);
        $memberRepo->method('findMembership')->willReturn(null);

        $em = $this->createMock(EntityManagerInterface::class);

        $service = new ForumModerationService(
            new GroupService(
                $memberRepo,
                $this->createMock(GroupInvitationRepository::class),
                $em,
                new CommentContentSanitizer(),
                $this->createMock(EventDispatcherInterface::class),
                $this->createPushNotificationService(),
            ),
            new FriendshipService(
                $this->createMock(FriendshipRepository::class),
                $em,
            ),
            $em,
        );

        $thread = new ForumThread();
        $group = new ActivityGroup();
        $group->setIsPrivate(true);
        $thread->setGroup($group);

        self::assertFalse($service->canAccess(new User(), $thread));
    }

    public function testHideReplyDoesNotDeleteIt(): void
    {
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects(self::once())->method('flush');

        $service = new ForumModerationService(
            new GroupService(
                $this->createMock(GroupMemberRepository::class),
                $this->createMock(GroupInvitationRepository::class),
                $em,
                new CommentContentSanitizer(),
                $this->createMock(EventDispatcherInterface::class),
                $this->createPushNotificationService(),
            ),
            new FriendshipService(
                $this->createMock(FriendshipRepository::class),
                $em,
            ),
            $em,
        );

        $reply = new ForumReply();
        $service->hideReply($reply);
        self::assertTrue($reply->isHidden());
    }
}
