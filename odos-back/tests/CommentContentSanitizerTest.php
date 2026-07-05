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

    public function testSanitizeReturnsEmptyStringForBlankOrTagOnlyInput(): void
    {
        $sanitizer = new CommentContentSanitizer();

        self::assertSame('', $sanitizer->sanitize(''));
        self::assertSame('', $sanitizer->sanitize("   \n\t  "));
        self::assertSame('', $sanitizer->sanitize('<br><hr/><img src="x">'));
    }

    public function testSanitizeStripsTagAttributesAndKeepsInnerText(): void
    {
        $sanitizer = new CommentContentSanitizer();

        self::assertSame(
            'lien cliquable',
            $sanitizer->sanitize('<a href="https://evil.example" onclick="steal()">lien</a> cliquable'),
        );
    }

    public function testSanitizeCollapsesRepeatedWhitespace(): void
    {
        $sanitizer = new CommentContentSanitizer();

        // Espaces multiples, tabulations et retours ligne se reduisent a une
        // simple espace ; les bords sont trimes.
        self::assertSame(
            'a b c',
            $sanitizer->sanitize("  a\n\n\tb \t  c  "),
        );
    }

    public function testSanitizeLeavesAlreadyCleanTextUnchanged(): void
    {
        $sanitizer = new CommentContentSanitizer();

        self::assertSame('Bonjour le forum', $sanitizer->sanitize('Bonjour le forum'));
    }
}
