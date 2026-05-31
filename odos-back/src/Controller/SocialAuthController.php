<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\Auth\SocialAuthService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class SocialAuthController extends AbstractController
{
    public function __construct(
        private readonly SocialAuthService $socialAuthService,
    ) {
    }

    #[Route('/api/auth/google', name: 'api_auth_google', methods: ['POST'])]
    public function google(Request $request): JsonResponse
    {
        /** @var array{idToken?: string} $body */
        $body = json_decode($request->getContent(), true) ?? [];
        $idToken = isset($body['idToken']) ? (string) $body['idToken'] : '';

        try {
            $tokens = $this->socialAuthService->authenticateGoogle($idToken);

            return $this->json($tokens, Response::HTTP_OK);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        } catch (\RuntimeException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
        }
    }

    #[Route('/api/auth/apple', name: 'api_auth_apple', methods: ['POST'])]
    public function apple(Request $request): JsonResponse
    {
        /** @var array{identityToken?: string, email?: string|null} $body */
        $body = json_decode($request->getContent(), true) ?? [];
        $identityToken = isset($body['identityToken']) ? (string) $body['identityToken'] : '';
        $email = isset($body['email']) && is_string($body['email']) ? $body['email'] : null;

        try {
            $tokens = $this->socialAuthService->authenticateApple($identityToken, $email);

            return $this->json($tokens, Response::HTTP_OK);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        } catch (\RuntimeException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
        }
    }
}
