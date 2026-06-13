<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Activity;
use App\Entity\ActivityGroup;
use App\Entity\SharedActivity;
use App\Entity\User;
use App\Repository\SharedActivityRepository;
use Doctrine\ORM\EntityManagerInterface;

final class SharedActivityService
{
    public function __construct(
        private readonly FriendshipService $friendshipService,
        private readonly GroupService $groupService,
        private readonly CommentContentSanitizer $sanitizer,
        private readonly EntityManagerInterface $em,
        private readonly SharedActivityRepository $sharedActivityRepository,
        private readonly PushNotificationService $pushNotificationService,
    ) {
    }

    public function share(
        User $sender,
        Activity $activity,
        ?User $receiver,
        ?ActivityGroup $group,
        ?string $message,
    ): SharedActivity {
        if (null === $receiver && null === $group) {
            throw new \InvalidArgumentException('Destinataire ou groupe requis.');
        }

        if (null !== $receiver) {
            if ($this->friendshipService->hasBlockBetween($sender, $receiver)) {
                throw new \InvalidArgumentException('Partage impossible avec cet utilisateur.');
            }
            if (!$this->friendshipService->areFriends($sender, $receiver)) {
                throw new \InvalidArgumentException('Vous devez être amis pour partager une activité.');
            }
        }

        if (null !== $group && !$this->groupService->isMember($sender, $group)) {
            throw new \InvalidArgumentException('Vous devez être membre du groupe pour partager.');
        }

        $shared = new SharedActivity();
        $shared->setSender($sender);
        $shared->setReceiver($receiver);
        $shared->setGroup($group);
        $shared->setActivity($activity);
        $shared->setMessage(null !== $message && '' !== trim($message)
            ? $this->sanitizer->sanitize(mb_substr($message, 0, 280))
            : null);

        $this->em->persist($shared);
        $this->em->flush();

        if ($receiver instanceof User) {
            $this->pushNotificationService->notifyUser(
                $receiver,
                'Activité partagée',
                $sender->getDisplayName().' vous a partagé une activité.',
                ['type' => 'activity_share', 'sharedActivityId' => $shared->getId()],
            );
        }

        return $shared;
    }

    public function userCanAccess(SharedActivity $shared, User $user): bool
    {
        if ($shared->getReceiver()?->getId() === $user->getId()) {
            return true;
        }

        $group = $shared->getGroup();

        return null === $shared->getReceiver()
            && null !== $group
            && $this->groupService->isMember($user, $group);
    }

    public function countUnread(User $user): int
    {
        return $this->sharedActivityRepository->countUnreadForReceiver($user);
    }
}
