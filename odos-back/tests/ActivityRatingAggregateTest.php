<?php

namespace App\Tests;

use PHPUnit\Framework\TestCase;

/**
 * Documents expected behaviour for denormalized rating aggregates (mirrors SQL AVG/COUNT).
 */
class ActivityRatingAggregateTest extends TestCase
{
    public function testAverageFromScores(): void
    {
        $scores = [5, 4, 5];
        $count = \count($scores);
        $avg = round(array_sum($scores) / $count, 2);
        self::assertSame(4.67, $avg);
    }

    public function testScoreValidationRange(): void
    {
        self::assertTrue($this->isValidScore(1));
        self::assertTrue($this->isValidScore(5));
        self::assertFalse($this->isValidScore(0));
        self::assertFalse($this->isValidScore(6));
    }

    private function isValidScore(int $score): bool
    {
        return $score >= 1 && $score <= 5;
    }
}
