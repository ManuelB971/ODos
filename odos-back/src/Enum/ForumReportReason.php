<?php

declare(strict_types=1);

namespace App\Enum;

enum ForumReportReason: string
{
    case Spam = 'spam';
    case Harassment = 'harassment';
    case Illegal = 'illegal';
    case Other = 'other';
}
