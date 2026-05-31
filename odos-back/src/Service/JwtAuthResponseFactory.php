<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\User;
use Gesdinet\JWTRefreshTokenBundle\Generator\RefreshTokenGeneratorInterface;
use Gesdinet\JWTRefreshTokenBundle\Model\RefreshTokenManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Services\JWTTokenManagerInterface;

/**
 * Réponse auth identique à POST /api/login (access + refresh JWT).
 */
final class JwtAuthResponseFactory
{
    public function __construct(
        private readonly JWTTokenManagerInterface $jwtManager,
        private readonly RefreshTokenGeneratorInterface $refreshTokenGenerator,
        private readonly RefreshTokenManagerInterface $refreshTokenManager,
        private readonly int $refreshTokenTtl,
    ) {
    }

    /**
     * @return array{token: string, refresh_token: string}
     */
    public function create(User $user): array
    {
        $token = $this->jwtManager->create($user);
        $refreshToken = $this->refreshTokenGenerator->createForUserWithTtl($user, $this->refreshTokenTtl);
        $this->refreshTokenManager->save($refreshToken);

        return [
            'token' => $token,
            'refresh_token' => (string) $refreshToken->getRefreshToken(),
        ];
    }
}
