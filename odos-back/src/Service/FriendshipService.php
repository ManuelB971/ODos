<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Conversation;
use App\Entity\Friendship;
use App\Entity\User;
use App\Enum\FriendshipStatus;
use App\Repository\ConversationRepository;
use App\Repository\FriendshipRepository;
use App\Repository\ParcoursCollaboratorRepository;
use Doctrine\ORM\EntityManagerInterface;

final class FriendshipService
{
    public function __construct(
        private readonly FriendshipRepository $friendshipRepository,
        private readonly ConversationRepository $conversationRepository,
        private readonly ParcoursCollaboratorRepository $collaboratorRepository,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public function canSendRequest(User $sender, User $receiver): bool
    {
        if ($sender->getId() === $receiver->getId()) {
            return false;
        }

        if ($this->isBlocked($sender, $receiver)) {
            return false;
        }

        $existing = $this->friendshipRepository->findBetweenUsers($sender, $receiver);
        if (null !== $existing) {
            return false;
        }

        return true;
    }

    public function sendRequest(User $sender, User $receiver): Friendship
    {
        if (!$this->canSendRequest($sender, $receiver)) {
            throw new \InvalidArgumentException('Impossible d\'envoyer cette demande d\'ami.');
        }

        $friendship = new Friendship();
        $friendship->setSender($sender);
        $friendship->setReceiver($receiver);
        $friendship->setStatus(FriendshipStatus::Pending);

        $this->em->persist($friendship);
        $this->em->flush();

        return $friendship;
    }

    public function acceptRequest(Friendship $friendship): void
    {
        if (FriendshipStatus::Pending !== $friendship->getStatus()) {
            throw new \InvalidArgumentException('Cette demande n\'est plus en attente.');
        }

        $friendship->setStatus(FriendshipStatus::Accepted);
        $friendship->setAcceptedAt(new \DateTimeImmutable());
        $this->em->flush();
    }

    /**
     * Bloque (de façon stricte) `$blocked` au nom de `$blocker` :
     * - l'éventuelle amitié/demande existante est convertie en blocage, avec le
     *   bloqueur enregistré comme `sender` (sens du blocage, pour le déblocage) ;
     * - la conversation existante entre les deux est supprimée (messages en cascade) ;
     * - la co-édition mutuelle de parcours est révoquée (les étapes déjà ajoutées
     *   restent en place, seul le lien collaborateur saute).
     */
    public function block(User $blocker, User $blocked): Friendship
    {
        if ($blocker->getId() === $blocked->getId()) {
            throw new \InvalidArgumentException('Action impossible.');
        }

        $existing = $this->friendshipRepository->findBetweenUsers($blocker, $blocked);
        $friendship = $existing ?? new Friendship();
        $friendship->setSender($blocker);
        $friendship->setReceiver($blocked);
        $friendship->setStatus(FriendshipStatus::Blocked);
        $friendship->setAcceptedAt(null);

        if (null === $existing) {
            $this->em->persist($friendship);
        }

        $conversation = $this->conversationRepository->findBetweenUsers($blocker, $blocked);
        if ($conversation instanceof Conversation) {
            $this->em->remove($conversation);
        }

        foreach ($this->collaboratorRepository->findCollaborationsBetween($blocker, $blocked) as $collaborator) {
            $this->em->remove($collaborator);
        }

        $this->em->flush();

        return $friendship;
    }

    /**
     * Débloque `$blocked` : seul l'auteur du blocage (le `sender` de la ligne
     * `Blocked`) peut le faire. Sans effet si aucun blocage de ce sens n'existe.
     */
    public function unblock(User $blocker, User $blocked): void
    {
        $existing = $this->friendshipRepository->findBetweenUsers($blocker, $blocked);
        if (null === $existing || FriendshipStatus::Blocked !== $existing->getStatus()) {
            return;
        }

        if ($existing->getSender()?->getId() !== $blocker->getId()) {
            throw new \InvalidArgumentException('Vous ne pouvez pas débloquer cet utilisateur.');
        }

        $this->em->remove($existing);
        $this->em->flush();
    }

    /**
     * Vrai si `$blocker` a explicitement bloqué `$blocked` (sens directionnel,
     * contrairement à {@see hasBlockBetween} qui est symétrique).
     */
    public function hasBlocked(User $blocker, User $blocked): bool
    {
        $existing = $this->friendshipRepository->findBetweenUsers($blocker, $blocked);

        return null !== $existing
            && FriendshipStatus::Blocked === $existing->getStatus()
            && $existing->getSender()?->getId() === $blocker->getId();
    }

    public function areFriends(User $a, User $b): bool
    {
        $existing = $this->friendshipRepository->findBetweenUsers($a, $b);

        return null !== $existing && FriendshipStatus::Accepted === $existing->getStatus();
    }

    public function isBlocked(User $a, User $b): bool
    {
        $existing = $this->friendshipRepository->findBetweenUsers($a, $b);
        if (null === $existing || FriendshipStatus::Blocked !== $existing->getStatus()) {
            return false;
        }

        $blocker = $existing->getSender();
        $blocked = $existing->getReceiver();

        return ($blocker === $a && $blocked === $b) || ($blocker === $b && $blocked === $a);
    }

    public function hasBlockBetween(User $a, User $b): bool
    {
        $existing = $this->friendshipRepository->findBetweenUsers($a, $b);

        return null !== $existing && FriendshipStatus::Blocked === $existing->getStatus();
    }
}
