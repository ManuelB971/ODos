<?php

declare(strict_types=1);

namespace App\Validator\Constraints;

use App\Repository\ActivityRepository;
use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;
use Symfony\Component\Validator\Exception\UnexpectedValueException;

final class ValidHomeCityValidator extends ConstraintValidator
{
    public function __construct(
        private readonly ActivityRepository $activityRepository,
    ) {
    }

    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof ValidHomeCity) {
            throw new UnexpectedTypeException($constraint, ValidHomeCity::class);
        }

        if (null === $value || '' === $value) {
            return;
        }

        if (!\is_string($value)) {
            throw new UnexpectedValueException($value, 'string');
        }

        if (!$this->activityRepository->isPublishedCityName($value)) {
            $this->context->buildViolation($constraint->message)
                ->addViolation();
        }
    }
}
