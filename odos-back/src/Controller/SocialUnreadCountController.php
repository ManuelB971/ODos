<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Repository\FriendshipRepository;
use App\Repository\GroupInvitationRepository;
use App\Repository\ChatMessageRepository;
use App\Repository\GroupMessageRepository;
use App\Service\SharedActivityService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/social')]
final class SocialUnreadCountController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly FriendshipRepository $friendshipRepository,
        private readonly GroupInvitationRepository $groupInvitationRepository,
        private readonly ChatMessageRepository $chatMessageRepository,
        private readonly GroupMessageRepository $groupMessageRepository,
        private readonly SharedActivityService $sharedActivityService,
    ) {
    }

    #[Route('/unread-count', name: 'api_social_unread_count', methods: ['GET'])]
    public function unreadCount(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        $pendingRequests = $this->friendshipRepository->countPendingReceived($user);
        $unreadShares = $this->sharedActivityService->countUnread($user);
        $pendingInvitations = $this->groupInvitationRepository->countPendingForUser($user);
        $unreadMessages = $this->chatMessageRepository->countUnreadForUser($user);
        $unreadGroupMessages = $this->groupMessageRepository->countUnreadForUser($user);

        return $this->json([
            'pendingFriendRequests' => $pendingRequests,
            'unreadShares' => $unreadShares,
            'pendingGroupInvitations' => $pendingInvitations,
            'unreadMessages' => $unreadMessages,
            'unreadGroupMessages' => $unreadGroupMessages,
            'total' => $pendingRequests + $unreadShares + $pendingInvitations + $unreadMessages + $unreadGroupMessages,
        ]);
    }
}
