<?php

namespace App\Controller;

use App\Entity\Activity;
use App\Entity\User;
use App\Repository\ActivityRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Manage favorite status of an Activity for the current authenticated user.
 */
#[Route('/api/activities/{id}/favorite', name: 'api_activity_favorite_')]
class FavoriteActivityController extends AbstractController
{
    public function __construct(
        private ActivityRepository $activityRepository,
        private EntityManagerInterface $em,
        private Security $security,
    ) {}

    #[Route('', name: 'add', methods: ['POST'])]
    public function addFavorite(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');

        $activity = $this->activityRepository->find($id);

        if (!$activity) {
            return $this->json([
                'message' => 'Activité introuvable.',
                'code' => Response::HTTP_NOT_FOUND,
                'details' => []
            ], Response::HTTP_NOT_FOUND);
        }

        if (!$activity->isPublished() && !$this->security->isGranted('ROLE_ADMIN')) {
            return $this->json([
                'message' => 'Activité non disponible.',
                'code' => Response::HTTP_NOT_FOUND,
                'details' => []
            ], Response::HTTP_NOT_FOUND);
        }

        $user = $this->security->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException('Utilisateur invalide.');
        }

        if (!$user->hasFavorite($activity)) {
            $user->addFavorite($activity);
            $this->em->flush();
        }

        return $this->json(['isFavorite' => true]);
    }

    #[Route('', name: 'remove', methods: ['DELETE'])]
    public function removeFavorite(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');

        $activity = $this->activityRepository->find($id);

        if (!$activity) {
            return $this->json([
                'message' => 'Activité introuvable.',
                'code' => Response::HTTP_NOT_FOUND,
                'details' => []
            ], Response::HTTP_NOT_FOUND);
        }

        if (!$activity->isPublished() && !$this->security->isGranted('ROLE_ADMIN')) {
            return $this->json([
                'message' => 'Activité non disponible.',
                'code' => Response::HTTP_NOT_FOUND,
                'details' => []
            ], Response::HTTP_NOT_FOUND);
        }

        $user = $this->security->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException('Utilisateur invalide.');
        }

        if ($user->hasFavorite($activity)) {
            $user->removeFavorite($activity);
            $this->em->flush();
        }

        return $this->json(['isFavorite' => false]);
    }
}
