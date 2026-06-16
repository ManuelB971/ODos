<?php

declare(strict_types=1);

namespace App\Service\Auth;

use Symfony\Component\HttpFoundation\Response;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Vérifie un id_token Google via l'endpoint tokeninfo (audience contrôlée).
 */
final class GoogleIdTokenVerifier
{
    /** @param list<string> $allowedClientIds */
    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly array $allowedClientIds,
    ) {
    }

    /**
     * @return array{sub: string, email: string, email_verified: bool, name?: string}
     */
    public function verify(string $idToken): array
    {
        if ('' === trim($idToken)) {
            throw new \InvalidArgumentException('Token Google manquant.');
        }

        if ([] === $this->allowedClientIds) {
            throw new \RuntimeException('Connexion Google non configurée sur le serveur.');
        }

        $response = $this->httpClient->request(
            'GET',
            'https://oauth2.googleapis.com/tokeninfo',
            ['query' => ['id_token' => $idToken]]
        );

        if (Response::HTTP_OK !== $response->getStatusCode()) {
            throw new \InvalidArgumentException('Token Google invalide ou expiré.');
        }

        /** @var array<string, mixed> $payload */
        $payload = $response->toArray(false);

        $aud = isset($payload['aud']) ? (string) $payload['aud'] : '';
        if (!in_array($aud, $this->allowedClientIds, true)) {
            throw new \InvalidArgumentException('Audience Google non autorisée.');
        }

        $sub = isset($payload['sub']) ? (string) $payload['sub'] : '';
        $email = isset($payload['email']) ? strtolower(trim((string) $payload['email'])) : '';
        $verified = filter_var($payload['email_verified'] ?? false, FILTER_VALIDATE_BOOLEAN);

        if ('' === $sub || '' === $email) {
            throw new \InvalidArgumentException('Token Google incomplet.');
        }

        if (!$verified) {
            throw new \InvalidArgumentException('Email Google non vérifié.');
        }

        $result = [
            'sub' => $sub,
            'email' => $email,
            'email_verified' => $verified,
        ];
        if (isset($payload['name'])) {
            $name = trim((string) $payload['name']);
            if ('' !== $name) {
                $result['name'] = $name;
            }
        }

        return $result;
    }
}
