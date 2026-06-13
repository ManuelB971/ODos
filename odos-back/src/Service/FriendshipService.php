<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Friendship;
use App\Entity\User;
use App\Enum\FriendshipStatus;
use App\Repository\FriendshipRepository;
use Doctrine\ORM\EntityManagerInterface;

final class FriendshipService
{
    public function __construct(
        private readonly FriendshipRepository $friendshipRepository,
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

    public function block(User $blocker, User $blocked): Friendship
    {
        $existing = $this->friendshipRepository->findBetweenUsers($blocker, $blocked);

        if (null !== $existing) {
            $existing->setStatus(FriendshipStatus::Blocked);
            $existing->setAcceptedAt(null);
            $this->em->flush();

            return $existing;
        }

        $friendship = new Friendship();
        $friendship->setSender($blocker);
        $friendship->setReceiver($blocked);
        $friendship->setStatus(FriendshipStatus::Blocked);

        $this->em->persist($friendship);
        $this->em->flush();

        return $friendship;
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
