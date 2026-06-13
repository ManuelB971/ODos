<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Event\ForumReplyCreatedEvent;
use App\Event\ForumReplyDeletedEvent;
use App\Event\ForumReplyLikedEvent;
use App\Event\ForumReplyUnlikedEvent;
use App\Repository\ForumReplyRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

final class ForumStatsSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly ForumReplyRepository $forumReplyRepository,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            ForumReplyCreatedEvent::class => 'onReplyCreated',
            ForumReplyDeletedEvent::class => 'onReplyDeleted',
            ForumReplyLikedEvent::class => 'onReplyLiked',
            ForumReplyUnlikedEvent::class => 'onReplyUnliked',
        ];
    }

    public function onReplyCreated(ForumReplyCreatedEvent $event): void
    {
        $reply = $event->getReply();
        $thread = $reply->getThread();
        if (null === $thread) {
            return;
        }

        $thread->incrementReplyCount();
        $thread->setLastReplyAt($reply->getCreatedAt());
        $this->em->flush();
    }

    public function onReplyDeleted(ForumReplyDeletedEvent $event): void
    {
        $reply = $event->getReply();
        $thread = $reply->getThread();
        if (null === $thread) {
            return;
        }

        $thread->decrementReplyCount();
        $deletedId = $reply->getId();
        $latest = null !== $deletedId
            ? $this->forumReplyRepository->findLatestForThreadExcluding($thread, $deletedId)
            : $this->forumReplyRepository->findLatestForThread($thread);
        $thread->setLastReplyAt($latest?->getCreatedAt());
        $this->em->flush();
    }

    public function onReplyLiked(ForumReplyLikedEvent $event): void
    {
        $reply = $event->getReply();
        $reply->incrementLikeCount();
        $this->em->flush();
    }

    public function onReplyUnliked(ForumReplyUnlikedEvent $event): void
    {
        $reply = $event->getReply();
        $reply->decrementLikeCount();
        $this->em->flush();
    }
}
