<?php

declare(strict_types=1);

namespace App\Tests;

use App\Form\Type\JsonArrayType;
use Symfony\Component\Form\Exception\TransformationFailedException;
use Symfony\Component\Form\Extension\Validator\ValidatorExtension;
use Symfony\Component\Form\Test\TypeTestCase;
use Symfony\Component\Validator\Validation;

final class JsonArrayTypeTest extends TypeTestCase
{
    protected function getExtensions(): array
    {
        return [
            new ValidatorExtension(Validation::createValidator()),
        ];
    }

    public function testEmptyValueBecomesNull(): void
    {
        $form = $this->factory->create(JsonArrayType::class, null);
        $form->submit('');

        self::assertTrue($form->isSynchronized());
        self::assertNull($form->getData());
    }

    public function testJsonObjectIsDecoded(): void
    {
        $form = $this->factory->create(JsonArrayType::class, null);
        $form->submit('{"threshold": 5, "categoryId": 2}');

        self::assertTrue($form->isSynchronized());
        self::assertSame(['threshold' => 5, 'categoryId' => 2], $form->getData());
    }

    public function testArrayIsEncodedForDisplay(): void
    {
        $form = $this->factory->create(JsonArrayType::class, ['threshold' => 3]);
        $view = $form->createView();

        self::assertStringContainsString('"threshold": 3', (string) $view->vars['value']);
    }

    public function testInvalidJsonFails(): void
    {
        $form = $this->factory->create(JsonArrayType::class, null);
        $form->submit('{threshold:}');

        self::assertFalse($form->isValid());
        self::assertInstanceOf(TransformationFailedException::class, $form->getTransformationFailure());
    }
}
