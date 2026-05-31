<?php

declare(strict_types=1);

namespace App\Service\Auth;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Vérifie un identityToken Sign in with Apple (JWKS Apple).
 */
final class AppleIdTokenVerifier
{
    private const APPLE_JWKS_URL = 'https://appleid.apple.com/auth/keys';
    private const APPLE_ISSUER = 'https://appleid.apple.com';

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $appleClientId,
    ) {
    }

    /**
     * @return array{sub: string, email?: string}
     */
    public function verify(string $identityToken): array
    {
        if ('' === trim($identityToken)) {
            throw new \InvalidArgumentException('Token Apple manquant.');
        }

        if ('' === $this->appleClientId) {
            throw new \RuntimeException('Connexion Apple non configurée sur le serveur.');
        }

        $response = $this->httpClient->request('GET', self::APPLE_JWKS_URL);
        if (Response::HTTP_OK !== $response->getStatusCode()) {
            throw new \RuntimeException('Impossible de récupérer les clés Apple.');
        }

        /** @var array{keys: list<array<string, mixed>>} $jwks */
        $jwks = $response->toArray(false);
        $keys = JWK::parseKeySet($jwks);

        $payload = JWT::decode($identityToken, $keys);
        /** @var array<string, mixed> $claims */
        $claims = (array) $payload;

        $iss = isset($claims['iss']) ? (string) $claims['iss'] : '';
        if (self::APPLE_ISSUER !== $iss) {
            throw new \InvalidArgumentException('Émetteur Apple invalide.');
        }

        $aud = isset($claims['aud']) ? (string) $claims['aud'] : '';
        if ($this->appleClientId !== $aud) {
            throw new \InvalidArgumentException('Audience Apple non autorisée.');
        }

        $sub = isset($claims['sub']) ? (string) $claims['sub'] : '';
        if ('' === $sub) {
            throw new \InvalidArgumentException('Token Apple incomplet.');
        }

        $email = isset($claims['email']) ? strtolower(trim((string) $claims['email'])) : null;

        return [
            'sub' => $sub,
            'email' => ('' !== ($email ?? '')) ? $email : null,
        ];
    }
}
