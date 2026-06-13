<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class SocialConsentController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly EntityManagerInterface $em,
    ) {
    }

    #[Route('/api/me/social-consent', name: 'api_me_social_consent', methods: ['POST'])]
    public function consent(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        if (!$user->hasSocialConsent()) {
            $user->setSocialConsentedAt(new \DateTimeImmutable());
            $this->em->flush();
        }

        return $this->json([
            'socialConsentedAt' => $user->getSocialConsentedAt()?->format(\DateTimeInterface::ATOM),
        ]);
    }
}
