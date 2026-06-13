<?php

declare(strict_types=1);

namespace App\Enum;

enum GroupInvitationStatus: string
{
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Declined = 'declined';
}
