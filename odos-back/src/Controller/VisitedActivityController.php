<?php

namespace App\Controller;

use App\Entity\User;
use App\Repository\ActivityRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Manage the "visited" status of an Activity for the current authenticated user.
 *
 * Signal explicite (« J'ai visité ») qui alimente le collaborative filtering
 * des recommandations : voir {@see \App\State\RecommendationStateProvider}.
 */
#[Route('/api/activities/{id}/visited', name: 'api_activity_visited_')]
class VisitedActivityController extends AbstractController
{
    public function __construct(
        private ActivityRepository $activityRepository,
        private EntityManagerInterface $em,
        private Security $security,
    ) {}

    #[Route('', name: 'add', methods: ['POST'])]
    public function addVisited(int $id): JsonResponse
    {
        $activity = $this->resolveActivity($id);
        if ($activity instanceof JsonResponse) {
            return $activity;
        }

        $user = $this->security->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException('Utilisateur invalide.');
        }

        if (!$user->hasVisited($activity)) {
            $user->addVisitedActivity($activity);
            $this->em->flush();
        }

        return $this->json(['isVisited' => true]);
    }

    #[Route('', name: 'remove', methods: ['DELETE'])]
    public function removeVisited(int $id): JsonResponse
    {
        $activity = $this->resolveActivity($id);
        if ($activity instanceof JsonResponse) {
            return $activity;
        }

        $user = $this->security->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException('Utilisateur invalide.');
        }

        if ($user->hasVisited($activity)) {
            $user->removeVisitedActivity($activity);
            $this->em->flush();
        }

        return $this->json(['isVisited' => false]);
    }

    /**
     * @return \App\Entity\Activity|JsonResponse the activity, or a 404 JSON response
     */
    private function resolveActivity(int $id): \App\Entity\Activity|JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');

        $activity = $this->activityRepository->find($id);

        if (!$activity) {
            return $this->json([
                'message' => 'Activité introuvable.',
                'code' => Response::HTTP_NOT_FOUND,
                'details' => [],
            ], Response::HTTP_NOT_FOUND);
        }

        if (!$activity->isPublished() && !$this->security->isGranted('ROLE_ADMIN')) {
            return $this->json([
                'message' => 'Activité non disponible.',
                'code' => Response::HTTP_NOT_FOUND,
                'details' => [],
            ], Response::HTTP_NOT_FOUND);
        }

        return $activity;
    }
}
