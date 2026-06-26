<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use App\Repository\ChatMessageRepository;
use App\Repository\FriendshipRepository;
use App\Repository\GroupInvitationRepository;
use App\Repository\GroupMessageRepository;
use App\Repository\SharedActivityRepository;

/**
 * Source unique du compteur « non-lus social » (badge onglet, badge icône OS,
 * badge dans le payload push).
 *
 * Dépend uniquement des repositories (jamais de {@see SharedActivityService} ni
 * de {@see PushNotificationService}) afin que {@see PushNotificationService}
 * puisse l'injecter sans créer de dépendance circulaire.
 */
final class SocialUnreadCountService
{
    public function __construct(
        private readonly FriendshipRepository $friendshipRepository,
        private readonly GroupInvitationRepository $groupInvitationRepository,
        private readonly ChatMessageRepository $chatMessageRepository,
        private readonly GroupMessageRepository $groupMessageRepository,
        private readonly SharedActivityRepository $sharedActivityRepository,
    ) {
    }

    /**
     * Détail des non-lus + total, format consommé par GET /api/social/unread-count.
     *
     * @return array{
     *     pendingFriendRequests: int,
     *     unreadShares: int,
     *     pendingGroupInvitations: int,
     *     unreadMessages: int,
     *     unreadGroupMessages: int,
     *     total: int
     * }
     */
    public function breakdown(User $user): array
    {
        $pendingRequests = $this->friendshipRepository->countPendingReceived($user);
        $unreadShares = $this->sharedActivityRepository->countUnreadForReceiver($user);
        $pendingInvitations = $this->groupInvitationRepository->countPendingForUser($user);
        $unreadMessages = $this->chatMessageRepository->countUnreadForUser($user);
        $unreadGroupMessages = $this->groupMessageRepository->countUnreadForUser($user);

        return [
            'pendingFriendRequests' => $pendingRequests,
            'unreadShares' => $unreadShares,
            'pendingGroupInvitations' => $pendingInvitations,
            'unreadMessages' => $unreadMessages,
            'unreadGroupMessages' => $unreadGroupMessages,
            'total' => $pendingRequests + $unreadShares + $pendingInvitations + $unreadMessages + $unreadGroupMessages,
        ];
    }

    /** Total des non-lus (badge). */
    public function total(User $user): int
    {
        return $this->breakdown($user)['total'];
    }
}
