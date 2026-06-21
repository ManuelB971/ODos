<?php

declare(strict_types=1);

namespace App\Validator\Constraints;

use Symfony\Component\Validator\Constraint;

#[\Attribute(\Attribute::TARGET_PROPERTY)]
final class ValidHomeCity extends Constraint
{
    public string $message = 'Cette ville n\'est pas disponible dans le catalogue d\'activités.';

    public function validatedBy(): string
    {
        return ValidHomeCityValidator::class;
    }
}
