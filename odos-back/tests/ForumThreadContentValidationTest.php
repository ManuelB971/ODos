<?php

declare(strict_types=1);

namespace App\Tests;

use PHPUnit\Framework\TestCase;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validation;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Garde-fou sur la borne de taille du contenu d'un fil forum.
 *
 * La création de fil passe par un contrôleur custom (ForumThreadController) et
 * non par API Platform ; la suite étant unit-only (pas de DB / pas de kernel
 * HTTP), on teste ici la contrainte de validation exactement telle qu'appliquée
 * par le contrôleur. Un contenu > 4000 caractères doit produire une violation
 * (le contrôleur renvoie alors 422), un contenu conforme n'en produit aucune.
 */
final class ForumThreadContentValidationTest extends TestCase
{
    private const MAX = 4000;

    private ValidatorInterface $validator;

    protected function setUp(): void
    {
        $this->validator = Validation::createValidator();
    }

    /**
     * @return list<Assert\Length>
     */
    private function contentConstraints(): array
    {
        // Doit rester identique aux contraintes de ForumThreadController::create.
        return [new Assert\Length(min: 2, max: self::MAX)];
    }

    public function testContentAtMaxLengthIsAccepted(): void
    {
        $content = str_repeat('a', self::MAX);

        $violations = $this->validator->validate($content, $this->contentConstraints());

        self::assertCount(0, $violations);
    }

    public function testContentOverMaxLengthIsRejected(): void
    {
        $content = str_repeat('a', self::MAX + 1);

        $violations = $this->validator->validate($content, $this->contentConstraints());

        self::assertGreaterThan(0, $violations->count());
    }

    public function testVeryLargeContentIsRejected(): void
    {
        $content = str_repeat('x', 2_000_000);

        $violations = $this->validator->validate($content, $this->contentConstraints());

        self::assertGreaterThan(0, $violations->count());
    }

    public function testTooShortContentIsRejected(): void
    {
        $violations = $this->validator->validate('a', $this->contentConstraints());

        self::assertGreaterThan(0, $violations->count());
    }

    public function testTypicalContentIsAccepted(): void
    {
        $violations = $this->validator->validate('Un message tout à fait normal.', $this->contentConstraints());

        self::assertCount(0, $violations);
    }
}
