<?php

declare(strict_types=1);

namespace App\Tests;

use App\Validator\Constraints\ValidHomeCity;
use App\Validator\Constraints\ValidHomeCityValidator;
use App\Repository\ActivityRepository;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Validator\Context\ExecutionContextInterface;
use Symfony\Component\Validator\Violation\ConstraintViolationBuilderInterface;

final class ValidHomeCityValidatorTest extends TestCase
{
    public function testAcceptsPublishedCity(): void
    {
        $repo = $this->createMock(ActivityRepository::class);
        $repo->method('isPublishedCityName')->with('Lyon')->willReturn(true);

        $validator = new ValidHomeCityValidator($repo);
        $context = $this->createMock(ExecutionContextInterface::class);
        $context->expects(self::never())->method('buildViolation');
        $validator->initialize($context);

        $validator->validate('Lyon', new ValidHomeCity());
    }

    public function testRejectsUnknownCity(): void
    {
        $repo = $this->createMock(ActivityRepository::class);
        $repo->method('isPublishedCityName')->with('Marseille')->willReturn(false);

        $validator = new ValidHomeCityValidator($repo);
        $builder = $this->createMock(ConstraintViolationBuilderInterface::class);
        $builder->expects(self::once())->method('addViolation')->willReturnSelf();

        $context = $this->createMock(ExecutionContextInterface::class);
        $context->expects(self::once())->method('buildViolation')->willReturn($builder);
        $validator->initialize($context);

        $validator->validate('Marseille', new ValidHomeCity());
    }
}
