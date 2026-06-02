<?php

declare(strict_types=1);

namespace App\Controller;

use App\Service\Auth\PasswordResetService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class PasswordResetController extends AbstractController
{
    private const GENERIC_REQUEST_MESSAGE =
        'Si un compte existe avec cette adresse, un email de réinitialisation vient d\'être envoyé.';

    public function __construct(
        private readonly PasswordResetService $passwordResetService,
    ) {
    }

    #[Route('/api/auth/password-reset/request', name: 'api_password_reset_request', methods: ['POST'])]
    public function request(Request $request): JsonResponse
    {
        /** @var array{email?: string} $body */
        $body = json_decode($request->getContent(), true) ?? [];
        $email = isset($body['email']) ? trim((string) $body['email']) : '';

        if ('' === $email || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->json(['message' => 'Adresse email invalide.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $this->passwordResetService->requestReset($email);
        } catch (\RuntimeException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        return $this->json(['message' => self::GENERIC_REQUEST_MESSAGE]);
    }

    #[Route('/api/auth/password-reset/confirm', name: 'api_password_reset_confirm', methods: ['POST'])]
    public function confirm(Request $request): JsonResponse
    {
        /** @var array{token?: string, password?: string} $body */
        $body = json_decode($request->getContent(), true) ?? [];
        $token = isset($body['token']) ? (string) $body['token'] : '';
        $password = isset($body['password']) ? (string) $body['password'] : '';

        try {
            $this->passwordResetService->confirmReset($token, $password);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'message' => 'Mot de passe mis à jour. Vous pouvez vous connecter.',
        ]);
    }
}
