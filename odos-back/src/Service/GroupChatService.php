<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Activity;
use App\Entity\ActivityGroup;
use App\Entity\GroupMessage;
use App\Entity\Parcours;
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

    public function sendMessage(
        User $author,
        ActivityGroup $group,
        string $content,
        ?Activity $activity = null,
        ?Parcours $parcours = null,
    ): GroupMessage {
        if (null === $this->groupMemberRepository->findMembership($author, $group)) {
            throw new \InvalidArgumentException('Vous devez être membre du groupe pour écrire.');
        }

        $content = $this->sanitizer->sanitize(trim($content));
        if (mb_strlen($content) > 2000) {
            throw new \InvalidArgumentException('Message invalide.');
        }
        // Un message doit porter du texte OU une pièce jointe (activité / parcours).
        if (mb_strlen($content) < 1 && !$activity instanceof Activity && !$parcours instanceof Parcours) {
            throw new \InvalidArgumentException('Message invalide.');
        }

        // Partager un parcours envoie une carte (lecture) au fil du groupe ; la
        // co-édition se fait via une invitation explicite, réservée aux amis.
        $message = new GroupMessage();
        $message->setGroup($group);
        $message->setAuthor($author);
        $message->setContent($content);
        $message->setActivity($activity);
        $message->setParcours($parcours);

        $this->em->persist($message);
        $this->em->flush();

        $this->notifyOtherMembers($author, $group, $this->notificationPreview($content, $activity, $parcours));

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

    private function notificationPreview(string $content, ?Activity $activity, ?Parcours $parcours): string
    {
        if ('' !== $content) {
            return mb_substr($content, 0, 120);
        }
        if ($parcours instanceof Parcours) {
            return sprintf('a partagé le parcours : %s', $parcours->getTitle());
        }
        if ($activity instanceof Activity) {
            return sprintf('a partagé : %s', $activity->getName() ?? 'une activité');
        }

        return 'a partagé du contenu';
    }

    private function notifyOtherMembers(User $author, ActivityGroup $group, string $preview): void
    {
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
