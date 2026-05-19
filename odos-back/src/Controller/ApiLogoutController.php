<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\RefreshToken;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Invalidation côté serveur des refresh tokens à la déconnexion mobile.
 */
final class ApiLogoutController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly EntityManagerInterface $em,
    ) {
    }

    #[Route('/api/logout', name: 'api_logout', methods: ['POST'])]
    public function logout(): JsonResponse
    {
        $user = $this->security->getUser();
        if ($user instanceof User) {
            $email = $user->getEmail();
            if (is_string($email) && '' !== $email) {
                $this->em->createQueryBuilder()
                    ->delete(RefreshToken::class, 'r')
                    ->where('r.username = :email')
                    ->setParameter('email', $email)
                    ->getQuery()
                    ->execute();
            }
        }

        return $this->json(['message' => 'Déconnecté.'], Response::HTTP_OK);
    }
}
