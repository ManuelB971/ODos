<?php

declare(strict_types=1);

namespace App\Tests;

use App\Command\PurgeInactiveUsersCommand;
use App\Entity\User;
use App\EventSubscriber\UserActivitySubscriber;
use App\Repository\CommentRepository;
use App\Repository\UserRepository;
use App\Service\EmailPseudonymizer;
use App\Service\UserDeletionService;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Query;
use Doctrine\ORM\QueryBuilder;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;
use Symfony\Component\Console\Tester\CommandTester;

final class InactiveUserPurgeTest extends TestCase
{
    public function testPurgeDeletesInactiveUsersButNeverAdmins(): void
    {
        $em = $this->entityManagerAcceptingQueries();
        $em->expects(self::once())->method('remove');

        $tester = $this->commandTester($em, [
            $this->user(1, ['ROLE_USER']),
            $this->user(2, ['ROLE_ADMIN']),
        ]);

        self::assertSame(0, $tester->execute([]));
        self::assertStringContainsString('1 compte(s)', $tester->getDisplay());
    }

    public function testDryRunDeletesNothing(): void
    {
        $em = $this->entityManagerAcceptingQueries();
        $em->expects(self::never())->method('remove');

        $tester = $this->commandTester($em, [$this->user(1, ['ROLE_USER'])]);

        self::assertSame(0, $tester->execute(['--dry-run' => true]));
        self::assertStringContainsString('simulation', $tester->getDisplay());
    }

    public function testRejectsRetentionShorterThanOneYear(): void
    {
        $tester = $this->commandTester($this->entityManagerAcceptingQueries(), []);

        self::assertSame(2, $tester->execute(['--months' => '6']));
    }

    public function testJwtCreationRecordsActivityOncePerDay(): void
    {
        $em = $this->entityManagerAcceptingQueries();
        $em->expects(self::once())->method('createQueryBuilder');
        $subscriber = new UserActivitySubscriber($em);
        $user = $this->user(1, ['ROLE_USER']);

        $subscriber->onJwtCreated(new JWTCreatedEvent([], $user));
        $subscriber->onJwtCreated(new JWTCreatedEvent([], $user));

        self::assertEquals(new \DateTimeImmutable('today'), $user->getLastActiveAt());
    }

    /**
     * @param list<User> $inactive
     */
    private function commandTester(EntityManagerInterface $em, array $inactive): CommandTester
    {
        $users = $this->createMock(UserRepository::class);
        $users->method('findInactiveSince')->willReturn($inactive);
        $comments = $this->createMock(CommentRepository::class);
        $comments->method('findBy')->willReturn([]);

        $deletion = new UserDeletionService(
            $em,
            $comments,
            new EmailPseudonymizer(),
            $this->createMock(LoggerInterface::class),
            sys_get_temp_dir(),
            '/uploads/avatars',
        );

        return new CommandTester(new PurgeInactiveUsersCommand($users, $deletion));
    }

    private function entityManagerAcceptingQueries(): EntityManagerInterface&MockObject
    {
        $em = $this->createMock(EntityManagerInterface::class);
        $qb = $this->createMock(QueryBuilder::class);
        $query = $this->createMock(Query::class);

        $em->method('createQueryBuilder')->willReturn($qb);
        foreach (['delete', 'update', 'select', 'from', 'where', 'andWhere', 'orWhere', 'set', 'setParameter'] as $method) {
            $qb->method($method)->willReturnSelf();
        }
        $qb->method('getQuery')->willReturn($query);
        $query->method('execute')->willReturn(0);
        $query->method('getResult')->willReturn([]);
        $query->method('getSingleScalarResult')->willReturn(0);

        return $em;
    }

    /**
     * @param list<string> $roles
     */
    private function user(int $id, array $roles): User
    {
        $user = new User();
        (new \ReflectionProperty(User::class, 'id'))->setValue($user, $id);
        $user->setEmail(sprintf('user%d@example.com', $id));
        $user->setRoles($roles);

        return $user;
    }
}
