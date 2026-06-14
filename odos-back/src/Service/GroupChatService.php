<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\ActivityGroup;
use App\Entity\GroupMessage;
use App\Entity\User;
use App\Repository\GroupMemberRepository;
use Doctrine\ORM\EntityManagerInterface;

final class GroupChatService
{
    public function __construct(
        private readonly GroupMemberRepository $groupMemberRepository,
        private readonly CommentContentSanitizer $sanitizer,
        private readonly PushNotificationService $pushNotificationService,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public function sendMessage(User $author, ActivityGroup $group, string $content): GroupMessage
    {
        if (null === $this->groupMemberRepository->findMembership($author, $group)) {
            throw new \InvalidArgumentException('Vous devez être membre du groupe pour écrire.');
        }

        $content = $this->sanitizer->sanitize(trim($content));
        if (mb_strlen($content) < 1 || mb_strlen($content) > 2000) {
            throw new \InvalidArgumentException('Message invalide.');
        }

        $message = new GroupMessage();
        $message->setGroup($group);
        $message->setAuthor($author);
        $message->setContent($content);

        $this->em->persist($message);
        $this->em->flush();

        $this->notifyOtherMembers($author, $group, $content);

        return $message;
    }

    public function markRead(User $viewer, ActivityGroup $group): void
    {
        $membership = $this->groupMemberRepository->findMembership($viewer, $group);
        if (null === $membership) {
            throw new \InvalidArgumentException('Accès refusé.');
        }

        $membership->setLastReadGroupMessageAt(new \DateTimeImmutable());
        $this->em->flush();
    }

    private function notifyOtherMembers(User $author, ActivityGroup $group, string $content): void
    {
        $preview = mb_substr($content, 0, 120);
        $title = $group->getName().' · '.$author->getDisplayName();

        foreach ($this->groupMemberRepository->findForGroup($group) as $member) {
            $recipient = $member->getUser();
            if (!$recipient instanceof User || $recipient->getId() === $author->getId()) {
                continue;
            }

            $this->pushNotificationService->notifyUser(
                $recipient,
                $title,
                $preview,
                ['type' => 'group_message', 'groupId' => $group->getId()],
            );
        }
    }
}
