<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Enum\FriendshipStatus;
use App\Repository\FriendshipRepository;
use App\Repository\UserRepository;

final class UserSearchService
{
    private const PER_PAGE = 20;

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly FriendshipRepository $friendshipRepository,
        private readonly FriendshipService $friendshipService,
    ) {
    }

    /**
     * @return array{users: list<array<string, mixed>>, page: int, itemsPerPage: int}
     */
    public function search(User $viewer, string $query, int $page): array
    {
        $query = trim($query);
        if (mb_strlen($query) < 2) {
            throw new \InvalidArgumentException('Saisissez au moins 2 caractères.');
        }

        $users = $this->userRepository->searchDiscoverable($viewer, $query, $page, self::PER_PAGE);

        $results = [];
        foreach ($users as $user) {
            if ($this->friendshipService->hasBlockBetween($viewer, $user)) {
                continue;
            }
            $results[] = [
                'id' => $user->getId(),
                'displayName' => $user->getDisplayName(),
                'alias' => $user->getAlias(),
                'avatarUrl' => $user->getAvatarUrl(),
                'relationship' => $this->relationshipStatus($viewer, $user),
            ];
        }

        return [
            'users' => $results,
            'page' => $page,
            'itemsPerPage' => self::PER_PAGE,
        ];
    }

    private function relationshipStatus(User $viewer, User $target): string
    {
        if ($this->friendshipService->areFriends($viewer, $target)) {
            return 'friends';
        }

        $friendship = $this->friendshipRepository->findBetweenUsers($viewer, $target);
        if (null === $friendship || FriendshipStatus::Pending !== $friendship->getStatus()) {
            return 'none';
        }

        return $friendship->getReceiver()?->getId() === $viewer->getId() ? 'incoming' : 'outgoing';
    }
}
