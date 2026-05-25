<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Gamification\GamificationEvent;
use App\Gamification\GamificationProfileService;
use App\Gamification\GamificationService;
use App\Service\ThrottledActionException;
use App\Service\UserActionThrottleService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/me')]
final class MeBadgesController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly GamificationProfileService $profileService,
        private readonly GamificationService $gamificationService,
        private readonly UserActionThrottleService $throttle,
    ) {
    }

    #[Route('/badges', name: 'api_me_badges', methods: ['GET'])]
    public function listBadges(): JsonResponse
    {
        $user = $this->requireUser();

        return $this->json($this->profileService->buildOverview($user));
    }

    #[Route('/badges/available', name: 'api_me_badges_available', methods: ['GET'])]
    public function listAvailable(): JsonResponse
    {
        $user = $this->requireUser();
        $overview = $this->profileService->buildOverview($user);

        return $this->json(['available' => $overview['available']]);
    }

    #[Route('/badges/{badgeId}/display', name: 'api_me_badge_display', methods: ['PATCH'], requirements: ['badgeId' => '\d+'])]
    public function patchDisplay(int $badgeId, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $data = $request->toArray();

        if (!array_key_exists('displayOnProfile', $data)) {
            return $this->json(['message' => 'Le champ displayOnProfile est requis.'], Response::HTTP_BAD_REQUEST);
        }

        $displayOnProfile = filter_var($data['displayOnProfile'], FILTER_VALIDATE_BOOL);
        $displayOrder = isset($data['displayOrder']) ? (int) $data['displayOrder'] : null;

        $result = $this->profileService->updateDisplay($user, $badgeId, $displayOnProfile, $displayOrder);
        if (null === $result) {
            return $this->json(['message' => 'Badge introuvable ou non obtenu.'], Response::HTTP_NOT_FOUND);
        }

        return $this->json($result);
    }

    #[Route('/badges/{badgeId}/seen', name: 'api_me_badge_seen', methods: ['POST'], requirements: ['badgeId' => '\d+'])]
    public function markSeen(int $badgeId): JsonResponse
    {
        $user = $this->requireUser();
        if (!$this->profileService->markBadgeSeen($user, $badgeId)) {
            return $this->json(['message' => 'Badge introuvable.'], Response::HTTP_NOT_FOUND);
        }

        return $this->json(['ok' => true]);
    }

    #[Route('/badges/seen-all', name: 'api_me_badges_seen_all', methods: ['POST'])]
    public function markAllSeen(): JsonResponse
    {
        $user = $this->requireUser();
        $count = $this->profileService->markAllSeen($user);

        return $this->json(['marked' => $count]);
    }

    #[Route('/gamification/events', name: 'api_me_gamification_events', methods: ['POST'])]
    public function postEvent(Request $request): JsonResponse
    {
        $user = $this->requireUser();

        try {
            $this->throttle->assertCanPostGamificationEvent((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->json(
                [
                    'message' => $e->getMessage(),
                    'retryAfterSeconds' => $e->getRetryAfterSeconds(),
                    'code' => 'RATE_LIMITED',
                ],
                Response::HTTP_TOO_MANY_REQUESTS,
                ['Retry-After' => (string) $e->getRetryAfterSeconds()]
            );
        }

        $data = $request->toArray();
        $type = (string) ($data['type'] ?? '');
        if (!in_array($type, GamificationEvent::all(), true)) {
            return $this->json(
                ['message' => 'Type d\'événement invalide.', 'allowed' => GamificationEvent::all()],
                Response::HTTP_BAD_REQUEST
            );
        }

        $context = is_array($data['context'] ?? null) ? $data['context'] : [];
        $unlocked = $this->gamificationService->evaluateAndAward($user, $type, $context);
        $this->throttle->markGamificationEventPosted((int) $user->getId());

        return $this->json([
            'unlocked' => $unlocked,
            'overview' => $this->profileService->buildOverview($user),
        ]);
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
}
