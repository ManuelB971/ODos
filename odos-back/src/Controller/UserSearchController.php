<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Service\ThrottledActionException;
use App\Service\UserActionThrottleService;
use App\Service\UserSearchService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/users')]
final class UserSearchController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly UserSearchService $userSearchService,
        private readonly UserActionThrottleService $throttle,
    ) {
    }

    #[Route('/search', name: 'api_users_search', methods: ['GET'])]
    public function search(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        if (!$user->hasSocialConsent()) {
            return $this->json(['message' => 'Consentement communautaire requis.', 'code' => 'SOCIAL_CONSENT_REQUIRED'], Response::HTTP_FORBIDDEN);
        }

        try {
            $this->throttle->assertCanSearchUsers((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->throttleResponse($e);
        }

        $page = max(1, (int) $request->query->get('page', 1));
        $query = (string) $request->query->get('q', '');

        try {
            $result = $this->userSearchService->search($user, $query, $page);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $this->throttle->markUserSearchPerformed((int) $user->getId());

        return $this->json($result);
    }

    private function requireUser(): User
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        return $user;
    }

    private function throttleResponse(ThrottledActionException $e): JsonResponse
    {
        return $this->json(
            ['message' => $e->getMessage(), 'retryAfterSeconds' => $e->getRetryAfterSeconds(), 'code' => 'RATE_LIMITED'],
            Response::HTTP_TOO_MANY_REQUESTS,
            ['Retry-After' => (string) $e->getRetryAfterSeconds()]
        );
    }
}
