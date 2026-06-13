<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\ChatMessage;
use App\Entity\Conversation;
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

    public function sendMessage(User $author, Conversation $conversation, string $content): ChatMessage
    {
        if (!$conversation->involves($author)) {
            throw new \InvalidArgumentException('Accès refusé.');
        }

        $content = $this->sanitizer->sanitize(trim($content));
        if (mb_strlen($content) < 1 || mb_strlen($content) > 2000) {
            throw new \InvalidArgumentException('Message invalide.');
        }

        $message = new ChatMessage();
        $message->setConversation($conversation);
        $message->setAuthor($author);
        $message->setContent($content);

        $conversation->setLastMessageAt($message->getCreatedAt());

        $this->em->persist($message);
        $this->em->flush();

        $recipient = $conversation->otherParticipant($author);
        if ($recipient instanceof User) {
            $this->pushNotificationService->notifyUser(
                $recipient,
                $author->getDisplayName(),
                mb_substr($content, 0, 120),
                ['type' => 'chat_message', 'conversationId' => $conversation->getId()],
            );
        }

        return $message;
    }

    public function markRead(User $viewer, Conversation $conversation): void
    {
        if (!$conversation->involves($viewer)) {
            throw new \InvalidArgumentException('Accès refusé.');
        }

        $this->messageRepository->markConversationRead($conversation, $viewer);
    }
}
