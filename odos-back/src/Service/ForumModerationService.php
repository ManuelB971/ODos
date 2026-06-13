<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\ForumReply;
use App\Entity\ForumThread;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;

final class ForumModerationService
{
    public function __construct(
        private readonly GroupService $groupService,
        private readonly FriendshipService $friendshipService,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public function lockThread(ForumThread $thread): void
    {
        $thread->setIsLocked(true);
        $this->em->flush();
    }

    public function hideReply(ForumReply $reply): void
    {
        $reply->setIsHidden(true);
        $this->em->flush();
    }

    public function canAccess(User $user, ForumThread $thread): bool
    {
        if ($user->isForumBanned()) {
            return false;
        }

        $author = $thread->getAuthor();
        if (null !== $author && $this->friendshipService->hasBlockBetween($user, $author)) {
            return false;
        }

        $group = $thread->getGroup();
        if (null !== $group && $group->isPrivate() && !$this->groupService->isMember($user, $group)) {
            return false;
        }

        return true;
    }
}
