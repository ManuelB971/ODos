<?php

declare(strict_types=1);

namespace App\Tests;

use App\Entity\AppTheme;
use App\Theme\PaletteSchema;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Validator\Context\ExecutionContextInterface;
use Symfony\Component\Validator\Violation\ConstraintViolationBuilderInterface;

final class AppThemeTest extends TestCase
{
    /** @return array<string, string> */
    private function completePalette(): array
    {
        $palette = [];
        foreach (PaletteSchema::KEYS as $key) {
            $palette[$key] = '#abcdef';
        }

        return $palette;
    }

    public function testValidJsonRoundTripsToArray(): void
    {
        $theme = new AppTheme();
        $json = (string) json_encode($this->completePalette());

        $theme->setLightPaletteJson($json);

        self::assertSame($this->completePalette(), $theme->getLightPalette());
        self::assertNotNull($theme->getLightPaletteJson());
    }

    public function testNullOrEmptyJsonClearsPalette(): void
    {
        $theme = new AppTheme();
        $theme->setLightPaletteJson('   ');
        self::assertNull($theme->getLightPalette());
        self::assertNull($theme->getLightPaletteJson());

        $theme->setDarkPaletteJson(null);
        self::assertNull($theme->getDarkPalette());
    }

    public function testInvalidJsonDoesNotThrowAndYieldsViolation(): void
    {
        $theme = new AppTheme();
        $theme->setLightPaletteJson('{ not valid json');

        // Pas d'exception, la palette reste nulle.
        self::assertNull($theme->getLightPalette());

        $context = $this->expectViolationAtPath('lightPaletteJson');
        $theme->validatePalettes($context);
    }

    public function testIncompletePaletteYieldsViolation(): void
    {
        $palette = $this->completePalette();
        unset($palette['accent']);

        $theme = new AppTheme();
        $theme->setDarkPaletteJson((string) json_encode($palette));

        $context = $this->expectViolationAtPath('darkPaletteJson');
        $theme->validatePalettes($context);
    }

    public function testCompletePalettesPassValidation(): void
    {
        $theme = new AppTheme();
        $theme->setLightPaletteJson((string) json_encode($this->completePalette()));
        $theme->setDarkPaletteJson((string) json_encode($this->completePalette()));

        $context = $this->createMock(ExecutionContextInterface::class);
        $context->expects(self::never())->method('buildViolation');

        $theme->validatePalettes($context);
    }

    public function testNullPalettesPassValidation(): void
    {
        $theme = new AppTheme();

        $context = $this->createMock(ExecutionContextInterface::class);
        $context->expects(self::never())->method('buildViolation');

        $theme->validatePalettes($context);
    }

    private function expectViolationAtPath(string $path): ExecutionContextInterface
    {
        $builder = $this->createMock(ConstraintViolationBuilderInterface::class);
        $builder->method('setParameter')->willReturnSelf();
        $builder->expects(self::once())->method('atPath')->with($path)->willReturnSelf();
        $builder->expects(self::once())->method('addViolation');

        $context = $this->createMock(ExecutionContextInterface::class);
        $context->expects(self::once())->method('buildViolation')->willReturn($builder);

        return $context;
    }
}
