<?php

namespace App\Tests;

use App\Service\ActivityImportResult;
use PHPUnit\Framework\TestCase;

final class ActivityImportResultTest extends TestCase
{
    public function testIsSuccessWhenNoFatalError(): void
    {
        $result = new ActivityImportResult();
        $result->createdCount = 3;
        $result->skippedCount = 1;

        self::assertTrue($result->isSuccess());
    }

    public function testIsFailureWhenFatalErrorIsSet(): void
    {
        $result = new ActivityImportResult();
        $result->fatalError = 'Spreadsheet unreadable';

        self::assertFalse($result->isSuccess());
    }
}

