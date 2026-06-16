<?php

namespace App\Controller;

use App\Entity\Activity;
use App\Entity\ActivityRating;
use App\Entity\User;
use App\Gamification\GamificationEvent;
use App\Gamification\GamificationService;
use App\Repository\ActivityRatingRepository;
use App\Repository\ActivityRepository;
use App\Service\ThrottledActionException;
use App\Service\UserActionThrottleService;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/activities/{id}/rating')]
class ActivityRatingController extends AbstractController
{
    public function __construct(
        private ActivityRepository $activityRepository,
        private ActivityRatingRepository $ratingRepository,
        private EntityManagerInterface $em,
        private Security $security,
        private ValidatorInterface $validator,
        private UserActionThrottleService $throttle,
        private LoggerInterface $logger,
        private GamificationService $gamificationService,
    ) {}

    #[Route('', name: 'api_activity_rating_get', methods: ['GET'])]
    public function get(int $id): JsonResponse
    {
        $activity = $this->findPublishedActivity($id);
        if (!$activity instanceof Activity) {
            return $this->json(['message' => 'Activité introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $user = $this->security->getUser();
        $userScore = null;
        if ($user instanceof User) {
            $existing = $this->ratingRepository->findOneByUserAndActivity($user, $activity);
            $userScore = $existing?->getScore();
        }

        return $this->json([
            'average' => $activity->getRatingAverage(),
            'count' => $activity->getRatingCount(),
            'userScore' => $userScore,
        ]);
    }

    #[Route('', name: 'api_activity_rating_put', methods: ['PUT'])]
    public function put(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $this->throttle->assertCanPutRating((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->json(
                [
                    'message' => $e->getMessage(),
                    'retryAfterSeconds' => $e->getRetryAfterSeconds(),
                    'code' => 'RATE_LIMITED',
                ],
                Response::HTTP_TOO_MANY_REQUESTS,
                ['Retry-After' => (string) $e->getRetryAfterSeconds()]
            );
        }

        $activity = $this->findPublishedActivity($id);
        if (!$activity instanceof Activity) {
            return $this->json(['message' => 'Activité introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $data = json_decode($request->getContent(), true);
        $score = isset($data['score']) ? (int) $data['score'] : 0;

        $violations = $this->validator->validate($score, [
            new Assert\Range(min: 1, max: 5, notInRangeMessage: 'La note doit être entre 1 et 5.'),
        ]);
        if (\count($violations) > 0) {
            foreach ($violations as $violation) {
                return $this->json(['message' => $violation->getMessage()], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        $rating = $this->ratingRepository->findOneByUserAndActivity($user, $activity);
        $isNew = !$rating instanceof ActivityRating;
        if ($rating instanceof ActivityRating) {
            $rating->setScore($score);
            $rating->setUpdatedAt(new \DateTimeImmutable());
        } else {
            $rating = new ActivityRating();
            $rating->setUser($user);
            $rating->setActivity($activity);
            $rating->setScore($score);
            $this->em->persist($rating);
        }

        $this->em->flush();
        $this->ratingRepository->refreshActivityAggregates($activity);
        $this->em->flush();

        $unlocked = [];
        if ($isNew) {
            $unlocked = $this->gamificationService->evaluateAndAward($user, GamificationEvent::RATING_CREATED);
        }

        $this->throttle->markRatingAction((int) $user->getId());
        $this->logger->info('rating.upsert', ['activityId' => $activity->getId(), 'userId' => $user->getId(), 'score' => $score]);

        return $this->json([
            'average' => $activity->getRatingAverage(),
            'count' => $activity->getRatingCount(),
            'userScore' => $score,
            'unlockedBadges' => $unlocked,
        ]);
    }

    #[Route('', name: 'api_activity_rating_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        try {
            $this->throttle->assertCanPutRating((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->json(
                [
                    'message' => $e->getMessage(),
                    'retryAfterSeconds' => $e->getRetryAfterSeconds(),
                    'code' => 'RATE_LIMITED',
                ],
                Response::HTTP_TOO_MANY_REQUESTS,
                ['Retry-After' => (string) $e->getRetryAfterSeconds()]
            );
        }

        $activity = $this->findPublishedActivity($id);
        if (!$activity instanceof Activity) {
            return $this->json(['message' => 'Activité introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $rating = $this->ratingRepository->findOneByUserAndActivity($user, $activity);
        if (!$rating instanceof ActivityRating) {
            return $this->json([
                'average' => $activity->getRatingAverage(),
                'count' => $activity->getRatingCount(),
                'userScore' => null,
            ]);
        }

        $this->em->remove($rating);
        $this->em->flush();
        $this->ratingRepository->refreshActivityAggregates($activity);
        $this->em->flush();

        $this->throttle->markRatingAction((int) $user->getId());
        $this->logger->info('rating.deleted', ['activityId' => $activity->getId(), 'userId' => $user->getId()]);

        return $this->json([
            'average' => $activity->getRatingAverage(),
            'count' => $activity->getRatingCount(),
            'userScore' => null,
        ]);
    }

    private function findPublishedActivity(int $id): ?Activity
    {
        $activity = $this->activityRepository->find($id);
        if (!$activity instanceof Activity) {
            return null;
        }
        if (!$activity->isPublished() && !$this->security->isGranted('ROLE_ADMIN')) {
            return null;
        }

        return $activity;
    }
}
