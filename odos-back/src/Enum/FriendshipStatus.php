<?php

declare(strict_types=1);

namespace App\Enum;

enum FriendshipStatus: string
{
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Blocked = 'blocked';
}
