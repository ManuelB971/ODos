<?php

namespace App\Tests;

use App\Service\CommentContentSanitizer;
use PHPUnit\Framework\TestCase;

final class CommentContentSanitizerTest extends TestCase
{
    public function testSanitizeStripsHtmlAndNormalizesWhitespace(): void
    {
        $sanitizer = new CommentContentSanitizer();

        $raw = " <b>Hello</b>\n\t  world   <script>alert('x')</script> ";
        $clean = $sanitizer->sanitize($raw);

        self::assertSame("Hello world alert('x')", $clean);
    }
}

