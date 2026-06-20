<?php

declare(strict_types=1);

namespace App\Tests;

use App\Entity\ContentReport;
use App\Entity\User;
use App\Enum\ContentReportTargetType;
use App\Enum\ForumReportReason;
use App\Repository\ContentReportRepository;
use App\Service\CommentContentSanitizer;
use App\Service\ContentReportService;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\TestCase;

final class ContentReportServiceTest extends TestCase
{
    private function user(int $id): User
    {
        $user = new User();
        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setValue($user, $id);

        return $user;
    }

    public function testCannotReportYourself(): void
    {
        $repo = $this->createMock(ContentReportRepository::class);
        $sanitizer = new CommentContentSanitizer();
        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects(self::never())->method('persist');

        $service = new ContentReportService($repo, $sanitizer, $em);

        $me = $this->user(1);
        $this->expectException(\InvalidArgumentException::class);
        $service->reportUser($me, $me, ForumReportReason::Spam, null);
    }

    public function testDuplicateReportIsIdempotent(): void
    {
        $existing = new ContentReport();
        $repo = $this->createMock(ContentReportRepository::class);
        $repo->method('findExisting')->willReturn($existing);

        $sanitizer = new CommentContentSanitizer();
        $em = $this->createMock(EntityManagerInterface::class);
        // Un doublon ne crée pas de nouvelle ligne.
        $em->expects(self::never())->method('persist');

        $service = new ContentReportService($repo, $sanitizer, $em);

        $result = $service->reportUser($this->user(1), $this->user(2), ForumReportReason::Harassment, null);
        self::assertSame($existing, $result);
    }

    public function testNewReportIsPersisted(): void
    {
        $repo = $this->createMock(ContentReportRepository::class);
        $repo->method('findExisting')->willReturn(null);

        $sanitizer = new CommentContentSanitizer();

        $em = $this->createMock(EntityManagerInterface::class);
        $em->expects(self::once())->method('persist')->with(self::isInstanceOf(ContentReport::class));
        $em->expects(self::once())->method('flush');

        $service = new ContentReportService($repo, $sanitizer, $em);

        $report = $service->reportUser($this->user(1), $this->user(2), ForumReportReason::Illegal, 'abus');
        self::assertSame(ContentReportTargetType::UserProfile, $report->getTargetType());
        self::assertSame(2, $report->getTargetId());
    }
}
