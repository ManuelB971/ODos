<?php

declare(strict_types=1);

namespace App\Tests;

use App\Entity\ActivityGroup;
use App\Entity\GroupInvitation;
use App\Entity\GroupMember;
use App\Entity\User;
use App\Enum\GroupInvitationStatus;
use App\Enum\GroupRole;
use App\Event\GroupMemberJoinedEvent;
use App\Repository\GroupInvitationRepository;
use App\Repository\GroupMemberRepository;
use App\Service\CommentContentSanitizer;
use App\Service\GroupService;
use App\Tests\Support\CreatesPushNotificationService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

final class GroupServiceTest extends TestCase
{
    use CreatesPushNotificationService;
    private function createService(
        int $userGroupCount = 0,
        int $groupMemberCount = 1,
        ?GroupInvitation $pendingInvite = null,
    ): GroupService {
        $memberRepo = $this->createMock(GroupMemberRepository::class);
        $memberRepo->method('countForUser')->willReturn($userGroupCount);
        $memberRepo->method('countForGroup')->willReturn($groupMemberCount);
        $memberRepo->method('findMembership')->willReturn(null);

        $inviteRepo = $this->createMock(GroupInvitationRepository::class);
        $inviteRepo->method('findPendingForUserAndGroup')->willReturn($pendingInvite);

        $em = $this->createMock(EntityManagerInterface::class);
        $em->method('persist');
        $em->method('flush');

        $dispatcher = $this->createMock(EventDispatcherInterface::class);
        $dispatcher->expects(self::any())->method('dispatch')->willReturnArgument(0);

        return new GroupService(
            $memberRepo,
            $inviteRepo,
            $em,
            new CommentContentSanitizer(),
            $dispatcher,
            $this->createPushNotificationService(),
        );
    }

    public function testMaxGroupsPerUserEnforced(): void
    {
        $service = $this->createService(userGroupCount: 10);
        $user = new User();
        $this->expectException(\InvalidArgumentException::class);
        $service->create($user, 'Test');
    }

    public function testMaxMembersEnforced(): void
    {
        $service = $this->createService(groupMemberCount: 50);
        $user = new User();
        $group = new ActivityGroup();
        $group->setMemberCount(50);
        self::assertFalse($service->canJoin($user, $group));
    }

    public function testPrivateGroupRequiresInvitation(): void
    {
        $service = $this->createService();
        $user = new User();
        $group = new ActivityGroup();
        $group->setIsPrivate(true);
        $group->setMemberCount(2);

        $this->expectException(\InvalidArgumentException::class);
        $service->join($user, $group);
    }

    public function testCreatorCannotLeave(): void
    {
        $memberRepo = $this->createMock(GroupMemberRepository::class);
        $membership = new GroupMember();
        $membership->setRole(GroupRole::Creator);
        $memberRepo->method('findMembership')->willReturn($membership);

        $service = new GroupService(
            $memberRepo,
            $this->createMock(GroupInvitationRepository::class),
            $this->createMock(EntityManagerInterface::class),
            new CommentContentSanitizer(),
            $this->createMock(EventDispatcherInterface::class),
            $this->createPushNotificationService(),
        );

        $this->expectException(\InvalidArgumentException::class);
        $service->leave(new User(), new ActivityGroup());
    }

    public function testAdminCannotManageOtherAdmin(): void
    {
        $group = new ActivityGroup();
        $actor = new User();
        $targetMember = new GroupMember();
        $targetMember->setRole(GroupRole::Admin);

        $actorMembership = new GroupMember();
        $actorMembership->setRole(GroupRole::Admin);

        $memberRepo = $this->createMock(GroupMemberRepository::class);
        $memberRepo->method('findMembership')->willReturnCallback(
            static fn (User $user, ActivityGroup $g) => $actorMembership,
        );

        $service = new GroupService(
            $memberRepo,
            $this->createMock(GroupInvitationRepository::class),
            $this->createMock(EntityManagerInterface::class),
            new CommentContentSanitizer(),
            $this->createMock(EventDispatcherInterface::class),
            $this->createPushNotificationService(),
        );

        self::assertFalse($service->canManageMember($actor, $group, $targetMember));
        self::assertFalse($service->canAssignRole($actor, $group, $targetMember, GroupRole::Member));
    }

    public function testCannotAssignCreatorRole(): void
    {
        $group = new ActivityGroup();
        $actor = new User();
        $targetMember = new GroupMember();
        $targetMember->setRole(GroupRole::Member);

        $actorMembership = new GroupMember();
        $actorMembership->setRole(GroupRole::Creator);

        $memberRepo = $this->createMock(GroupMemberRepository::class);
        $memberRepo->method('findMembership')->willReturn($actorMembership);

        $service = new GroupService(
            $memberRepo,
            $this->createMock(GroupInvitationRepository::class),
            $this->createMock(EntityManagerInterface::class),
            new CommentContentSanitizer(),
            $this->createMock(EventDispatcherInterface::class),
            $this->createPushNotificationService(),
        );

        self::assertFalse($service->canAssignRole($actor, $group, $targetMember, GroupRole::Creator));
    }
}
