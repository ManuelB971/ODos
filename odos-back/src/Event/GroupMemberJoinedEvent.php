<?php

declare(strict_types=1);

namespace App\Event;

use App\Entity\ActivityGroup;
use Symfony\Contracts\EventDispatcher\Event;

final class GroupMemberJoinedEvent extends Event
{
    public function __construct(
        private readonly ActivityGroup $group,
    ) {
    }

    public function getGroup(): ActivityGroup
    {
        return $this->group;
    }
}
