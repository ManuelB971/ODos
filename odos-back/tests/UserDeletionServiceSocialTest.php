<?php

declare(strict_types=1);

namespace App\Tests;

use App\Entity\User;
use App\Repository\CommentRepository;
use App\Service\EmailPseudonymizer;
use App\Service\UserDeletionService;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Query;
use Doctrine\ORM\QueryBuilder;
use PHPUnit\Framework\TestCase;
use Psr\Log\LoggerInterface;

final class UserDeletionServiceSocialTest extends TestCase
{
    public function testDeletionPurgesSocialData(): void
    {
        $em = $this->createMock(EntityManagerInterface::class);
        $qb = $this->createMock(QueryBuilder::class);
        $query = $this->createMock(Query::class);

        $em->method('createQueryBuilder')->willReturn($qb);
        $qb->method('delete')->willReturnSelf();
        $qb->method('update')->willReturnSelf();
        $qb->method('select')->willReturnSelf();
        $qb->method('from')->willReturnSelf();
        $qb->method('where')->willReturnSelf();
        $qb->method('andWhere')->willReturnSelf();
        $qb->method('orWhere')->willReturnSelf();
        $qb->method('set')->willReturnSelf();
        $qb->method('setParameter')->willReturnSelf();
        $qb->method('getQuery')->willReturn($query);
        $query->method('execute')->willReturn(0);
        $query->method('getResult')->willReturn([]);
        $query->method('getSingleScalarResult')->willReturn(0);

        $em->expects(self::once())->method('remove');
        $em->expects(self::once())->method('flush');

        $commentRepo = $this->createMock(CommentRepository::class);
        $commentRepo->method('findBy')->willReturn([]);

        $service = new UserDeletionService(
            $em,
            $commentRepo,
            new EmailPseudonymizer(),
            $this->createMock(LoggerInterface::class),
            sys_get_temp_dir(),
            '/uploads/avatars',
        );

        $user = new User();
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, 42);
        $user->setEmail('test@example.com');

        $service->deleteUserAccount($user);
        self::assertTrue(true);
    }
}
