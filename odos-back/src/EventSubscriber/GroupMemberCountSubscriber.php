<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Event\GroupMemberJoinedEvent;
use App\Event\GroupMemberLeftEvent;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

final class GroupMemberCountSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            GroupMemberJoinedEvent::class => 'onJoined',
            GroupMemberLeftEvent::class => 'onLeft',
        ];
    }

    public function onJoined(GroupMemberJoinedEvent $event): void
    {
        $group = $event->getGroup();
        $group->incrementMemberCount();
        $this->em->flush();
    }

    public function onLeft(GroupMemberLeftEvent $event): void
    {
        $group = $event->getGroup();
        $group->decrementMemberCount();
        $this->em->flush();
    }
}
