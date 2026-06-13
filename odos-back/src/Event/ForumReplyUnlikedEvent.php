<?php

declare(strict_types=1);

namespace App\Event;

use App\Entity\ForumReply;
use Symfony\Contracts\EventDispatcher\Event;

final class ForumReplyUnlikedEvent extends Event
{
    public function __construct(
        private readonly ForumReply $reply,
    ) {
    }

    public function getReply(): ForumReply
    {
        return $this->reply;
    }
}
