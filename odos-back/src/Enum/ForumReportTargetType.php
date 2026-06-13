<?php

declare(strict_types=1);

namespace App\Enum;

enum ForumReportTargetType: string
{
    case Thread = 'thread';
    case Reply = 'reply';
}
