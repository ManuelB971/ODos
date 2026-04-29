<?php

namespace App\Tests;

use App\Service\ThrottledActionException;
use PHPUnit\Framework\TestCase;

final class ThrottledActionExceptionTest extends TestCase
{
    public function testRetryAfterIsAtLeastOneSecond(): void
    {
        $negative = new ThrottledActionException('wait', -4);
        $zero = new ThrottledActionException('wait', 0);
        $positive = new ThrottledActionException('wait', 7);

        self::assertSame(1, $negative->getRetryAfterSeconds());
        self::assertSame(1, $zero->getRetryAfterSeconds());
        self::assertSame(7, $positive->getRetryAfterSeconds());
    }
}

