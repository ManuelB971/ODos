<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Activity;
use App\Entity\ChatMessage;
use App\Entity\Conversation;
use App\Entity\Parcours;
use App\Entity\User;
use App\Repository\ChatMessageRepository;
use App\Repository\ConversationRepository;
use Doctrine\ORM\EntityManagerInterface;

final class ChatService
{
    public function __construct(
        private readonly ConversationRepository $conversationRepository,
        private readonly ChatMessageRepository $messageRepository,
        private readonly FriendshipService $friendshipService,
        private readonly CommentContentSanitizer $sanitizer,
        private readonly PushNotificationService $pushNotificationService,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public function openConversation(User $viewer, User $peer): Conversation
    {
        if ($viewer->getId() === $peer->getId()) {
            throw new \InvalidArgumentException('Conversation invalide.');
        }

        if ($this->friendshipService->hasBlockBetween($viewer, $peer)) {
            throw new \InvalidArgumentException('Conversation impossible avec cet utilisateur.');
        }

        if (!$this->friendshipService->areFriends($viewer, $peer)) {
            throw new \InvalidArgumentException('Vous devez être amis pour discuter.');
        }

        $existing = $this->conversationRepository->findBetweenUsers($viewer, $peer);
        if ($existing instanceof Conversation) {
            return $existing;
        }

        [$one, $two] = ConversationRepository::normalizePair($viewer, $peer);
        $conversation = new Conversation();
        $conversation->setUserOne($one);
        $conversation->setUserTwo($two);

        $this->em->persist($conversation);
        $this->em->flush();

        return $conversation;
    }

    public function sendMessage(
        User $author,
        Conversation $conversation,
        string $content,
        ?Activity $activity = null,
        ?Parcours $parcours = null,
    ): ChatMessage {
        if (!$conversation->involves($author)) {
            throw new \InvalidArgumentException('Accès refusé.');
        }

        $content = $this->sanitizer->sanitize(trim($content));
        if (mb_strlen($content) > 2000) {
            throw new \InvalidArgumentException('Message invalide.');
        }
        // Un message doit porter du texte OU une pièce jointe (activité / parcours).
        if (mb_strlen($content) < 1 && !$activity instanceof Activity && !$parcours instanceof Parcours) {
            throw new \InvalidArgumentException('Message invalide.');
        }

        $recipient = $conversation->otherParticipant($author);

        // Partager un parcours envoie une carte (lecture) ; la co-édition se fait via
        // une invitation explicite distincte ({@see ParcoursService::addCollaborator}).
        $message = new ChatMessage();
        $message->setConversation($conversation);
        $message->setAuthor($author);
        $message->setContent($content);
        $message->setActivity($activity);
        $message->setParcours($parcours);

        $conversation->setLastMessageAt($message->getCreatedAt());

        $this->em->persist($message);
        $this->em->flush();

        if ($recipient instanceof User) {
            $preview = $this->notificationPreview($content, $activity, $parcours);
            $this->pushNotificationService->notifyUser(
                $recipient,
                $author->getDisplayName(),
                $preview,
                ['type' => 'chat_message', 'conversationId' => $conversation->getId()],
            );
        }

        return $message;
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

    public function markRead(User $viewer, Conversation $conversation): void
    {
        if (!$conversation->involves($viewer)) {
            throw new \InvalidArgumentException('Accès refusé.');
        }

        $this->messageRepository->markConversationRead($conversation, $viewer);
    }
}
