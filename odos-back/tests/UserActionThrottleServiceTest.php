<?php

namespace App\Tests;

use App\Service\ThrottledActionException;
use App\Service\UserActionThrottleService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Cache\Adapter\ArrayAdapter;

final class UserActionThrottleServiceTest extends TestCase
{
    public function testCommentThrottleThrowsWhenTooFrequent(): void
    {
        $cache = new ArrayAdapter();
        $service = new UserActionThrottleService($cache);

        $service->markCommentPosted(12);

        $this->expectException(ThrottledActionException::class);
        $service->assertCanPostComment(12);
    }

    public function testRatingAndAvatarThrottleThrowWhenTooFrequent(): void
    {
        $cache = new ArrayAdapter();
        $service = new UserActionThrottleService($cache);

        $service->markRatingAction(5);
        $service->markAvatarUploaded(5);

        try {
            $service->assertCanPutRating(5);
            self::fail('Expected rating throttle');
        } catch (ThrottledActionException $e) {
            self::assertGreaterThanOrEqual(1, $e->getRetryAfterSeconds());
        }

        try {
            $service->assertCanUploadAvatar(5);
            self::fail('Expected avatar throttle');
        } catch (ThrottledActionException $e) {
            self::assertGreaterThanOrEqual(1, $e->getRetryAfterSeconds());
        }
    }

    public function testFirstCallPassesBeforeAnyMarking(): void
    {
        $cache = new ArrayAdapter();
        $service = new UserActionThrottleService($cache);

        $service->assertCanPostComment(99);
        $service->assertCanPutRating(99);
        $service->assertCanUploadAvatar(99);

        self::assertTrue(true);
    }
}

