<?php

declare(strict_types=1);

namespace App\Tests;

use App\Service\BadgeDescriptionSanitizer;
use PHPUnit\Framework\TestCase;

final class BadgeDescriptionSanitizerTest extends TestCase
{
    private BadgeDescriptionSanitizer $sanitizer;

    protected function setUp(): void
    {
        $this->sanitizer = new BadgeDescriptionSanitizer();
    }

    public function testStripsDivWrappers(): void
    {
        self::assertSame(
            'Tu as consulté ta première fiche activité.',
            $this->sanitizer->toPlainText('<div>Tu as consulté ta première fiche activité.</div>'),
        );
    }

    public function testDecodesEntitiesAndCollapsesWhitespace(): void
    {
        self::assertSame(
            'L\'aventure commence !',
            $this->sanitizer->toPlainText('<div>L&apos;aventure commence&nbsp;!</div>'),
        );
    }

    public function testEntitySetterStoresPlainText(): void
    {
        $badge = new \App\Entity\BadgeDefinition();
        $badge->setDescription('<div>Explorateur</div>');

        self::assertSame('Explorateur', $badge->getDescription());
    }
}
