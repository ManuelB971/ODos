<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Gamification\GamificationProfileService;
use App\Repository\ForumThreadRepository;
use App\Repository\UserBadgeRepository;
use App\Repository\UserRepository;
use App\Service\FriendshipService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class UserProfileController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly UserRepository $userRepository,
        private readonly FriendshipService $friendshipService,
        private readonly UserBadgeRepository $userBadgeRepository,
        private readonly ForumThreadRepository $forumThreadRepository,
        private readonly GamificationProfileService $gamificationProfileService,
    ) {
    }

    #[Route('/api/users/{id}/profile', name: 'api_user_profile', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function profile(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $viewer = $this->security->getUser();
        if (!$viewer instanceof User) {
            return $this->json(['message' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        $profileUser = $this->userRepository->find($id);
        if (!$profileUser instanceof User) {
            return $this->json(['message' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        // L'autre m'a bloqué : profil totalement inaccessible.
        if ($this->friendshipService->hasBlocked($profileUser, $viewer)) {
            return $this->json(['message' => 'Profil inaccessible.'], Response::HTTP_FORBIDDEN);
        }

        // Moi je l'ai bloqué : profil minimal, juste de quoi le reconnaître et le débloquer.
        $iBlockedThem = $this->friendshipService->hasBlocked($viewer, $profileUser);

        $payload = [
            'id' => $profileUser->getId(),
            'alias' => $profileUser->getAlias(),
            'bio' => (!$iBlockedThem && $profileUser->isProfilePublic()) ? $profileUser->getBio() : null,
            'avatarUrl' => $profileUser->getAvatarUrl(),
            'joinedAt' => $profileUser->getConsentedAt()?->format(\DateTimeInterface::ATOM),
            'isBlockedByMe' => $iBlockedThem,
        ];

        if (!$iBlockedThem && $profileUser->isProfilePublic()) {
            $payload['badgeCount'] = count($this->userBadgeRepository->findForUserOrdered($profileUser));
            $payload['favoriteCount'] = $profileUser->getFavorites()->count();
            $payload['visitCount'] = $profileUser->getVisitedActivities()->count();
            $payload['forumThreadCount'] = $this->forumThreadRepository->countByAuthor($profileUser);
            $payload['profileBadges'] = $this->gamificationProfileService->buildProfileDisplayedBadges($profileUser);
        }

        return $this->json($payload);
    }
}
