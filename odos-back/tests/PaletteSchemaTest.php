<?php

declare(strict_types=1);

namespace App\Tests;

use App\Theme\PaletteSchema;
use PHPUnit\Framework\TestCase;

final class PaletteSchemaTest extends TestCase
{
    /** @return array<string, string> */
    private function completePalette(): array
    {
        $palette = [];
        foreach (PaletteSchema::KEYS as $key) {
            $palette[$key] = '#000000';
        }

        return $palette;
    }

    public function testCompletePaletteHasNoMissingKeys(): void
    {
        self::assertSame([], PaletteSchema::missingKeys($this->completePalette()));
        self::assertTrue(PaletteSchema::isComplete($this->completePalette()));
    }

    public function testMissingKeyIsReported(): void
    {
        $palette = $this->completePalette();
        unset($palette['accent']);

        self::assertSame(['accent'], PaletteSchema::missingKeys($palette));
        self::assertFalse(PaletteSchema::isComplete($palette));
    }

    public function testEmptyOrNonStringValuesAreReported(): void
    {
        $palette = $this->completePalette();
        $palette['text'] = '   ';
        $palette['background'] = 123;

        $missing = PaletteSchema::missingKeys($palette);
        self::assertContains('text', $missing);
        self::assertContains('background', $missing);
    }

    public function testNormalizeTrimsAndRestrictsToKnownKeys(): void
    {
        $palette = $this->completePalette();
        $palette['text'] = '  #111111  ';
        $palette['rogue'] = 'should be dropped';

        $normalized = PaletteSchema::normalize($palette);

        self::assertSame('#111111', $normalized['text']);
        self::assertArrayNotHasKey('rogue', $normalized);
        self::assertSame(PaletteSchema::KEYS, array_keys($normalized));
    }
}
