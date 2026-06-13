<?php

declare(strict_types=1);

namespace App\Enum;

enum GroupRole: string
{
    case Creator = 'creator';
    case Admin = 'admin';
    case Member = 'member';

    public function rank(): int
    {
        return match ($this) {
            self::Creator => 3,
            self::Admin => 2,
            self::Member => 1,
        };
    }

    public function isAtLeast(self $min): bool
    {
        return $this->rank() >= $min->rank();
    }
}
