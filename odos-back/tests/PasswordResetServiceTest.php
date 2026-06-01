<?php

declare(strict_types=1);

namespace App\Tests;

use App\Entity\User;
use App\Repository\UserRepository;
use App\Service\Auth\PasswordResetService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

final class PasswordResetServiceTest extends TestCase
{
    public function testConfirmResetRejectsShortPassword(): void
    {
        $service = new PasswordResetService(
            $this->createMock(UserRepository::class),
            $this->createMock(EntityManagerInterface::class),
            $this->createMock(UserPasswordHasherInterface::class),
            $this->createMock(MailerInterface::class),
            new NullLogger(),
            'ODos <noreply@odos.world>',
            'odosfront',
            true,
        );

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('6 caractères');

        $service->confirmReset('valid-token-value-here-1234567890ab', 'abc');
    }

    public function testConfirmResetRejectsUnknownToken(): void
    {
        $repository = $this->createMock(UserRepository::class);
        $repository->method('findOneBy')->willReturn(null);

        $service = new PasswordResetService(
            $repository,
            $this->createMock(EntityManagerInterface::class),
            $this->createMock(UserPasswordHasherInterface::class),
            $this->createMock(MailerInterface::class),
            new NullLogger(),
            'ODos <noreply@odos.world>',
            'odosfront',
            true,
        );

        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Code invalide ou expiré.');

        $service->confirmReset('unknown-token-value-123456789012345678', 'secret123');
    }

    public function testConfirmResetUpdatesPasswordAndClearsToken(): void
    {
        $user = new User();
        $user->setEmail('user@example.com');
        $token = bin2hex(random_bytes(32));
        $user->setPasswordResetTokenHash(hash('sha256', $token));
        $user->setPasswordResetExpiresAt(new \DateTimeImmutable('+30 minutes'));

        $repository = $this->createMock(UserRepository::class);
        $repository->method('findOneBy')->willReturn($user);

        $hasher = $this->createMock(UserPasswordHasherInterface::class);
        $hasher->expects($this->once())
            ->method('hashPassword')
            ->with($user, 'newpass123')
            ->willReturn('hashed-value');

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects($this->once())->method('flush');

        $service = new PasswordResetService(
            $repository,
            $em,
            $hasher,
            $this->createMock(MailerInterface::class),
            new NullLogger(),
            'ODos <noreply@odos.world>',
            'odosfront',
            true,
        );

        $service->confirmReset($token, 'newpass123');

        $this->assertSame('hashed-value', $user->getPassword());
        $this->assertNull($user->getPasswordResetTokenHash());
        $this->assertNull($user->getPasswordResetExpiresAt());
    }
}
