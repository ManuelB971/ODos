<?php

declare(strict_types=1);

namespace App\Enum;

enum ForumReportStatus: string
{
    case Pending = 'pending';
    case Reviewed = 'reviewed';
    case Dismissed = 'dismissed';
    case ActionTaken = 'action_taken';
}
