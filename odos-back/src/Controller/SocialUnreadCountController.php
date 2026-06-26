<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Service\SocialUnreadCountService;
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
        private readonly SocialUnreadCountService $socialUnreadCountService,
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

        return $this->json($this->socialUnreadCountService->breakdown($user));
    }
}
