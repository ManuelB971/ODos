<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Service\PushTokenService;
use App\Service\ThrottledActionException;
use App\Service\UserActionThrottleService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class PushTokenController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly PushTokenService $pushTokenService,
        private readonly UserActionThrottleService $throttle,
    ) {
    }

    #[Route('/api/me/push-token', name: 'api_me_push_token_register', methods: ['POST'])]
    public function register(Request $request): JsonResponse
    {
        $user = $this->requireUser();

        try {
            $this->throttle->assertCanRegisterPushToken((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->throttleResponse($e);
        }

        $data = $request->toArray();
        $token = (string) ($data['token'] ?? '');
        $platform = (string) ($data['platform'] ?? 'unknown');

        try {
            $this->pushTokenService->register($user, $token, $platform);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $this->throttle->markPushTokenRegistered((int) $user->getId());

        return $this->json(['message' => 'Token enregistré.'], Response::HTTP_CREATED);
    }

    #[Route('/api/me/push-token', name: 'api_me_push_token_delete', methods: ['DELETE'])]
    public function unregister(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $token = (string) ($request->toArray()['token'] ?? '');
        $this->pushTokenService->unregister($user, $token);

        return $this->json(['message' => 'Token supprimé.']);
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
