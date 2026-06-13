<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\SharedActivity;
use App\Entity\User;
use App\Gamification\GamificationEvent;
use App\Gamification\GamificationService;
use App\Repository\ActivityGroupRepository;
use App\Repository\ActivityRepository;
use App\Repository\SharedActivityRepository;
use App\Repository\UserRepository;
use App\Service\SharedActivityService;
use App\Service\SocialSerializer;
use App\Service\ThrottledActionException;
use App\Service\UserActionThrottleService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/shared-activities')]
final class SharedActivityController extends AbstractController
{
    private const PER_PAGE = 20;

    public function __construct(
        private readonly Security $security,
        private readonly SharedActivityRepository $sharedActivityRepository,
        private readonly ActivityRepository $activityRepository,
        private readonly UserRepository $userRepository,
        private readonly ActivityGroupRepository $groupRepository,
        private readonly SharedActivityService $sharedActivityService,
        private readonly SocialSerializer $serializer,
        private readonly UserActionThrottleService $throttle,
        private readonly EntityManagerInterface $em,
        private readonly GamificationService $gamificationService,
    ) {
    }

    #[Route('', name: 'api_shared_activities_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $page = max(1, (int) $request->query->get('page', 1));
        $items = $this->sharedActivityRepository->findReceivedPaginated($user, $page, self::PER_PAGE);

        return $this->json([
            'member' => array_map(fn (SharedActivity $s) => $this->serializer->sharedActivityToArray($s), $items),
            'totalItems' => $this->sharedActivityRepository->countReceived($user),
            'page' => $page,
            'itemsPerPage' => self::PER_PAGE,
        ]);
    }

    #[Route('', name: 'api_shared_activities_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->requireUser();

        try {
            $this->throttle->assertCanShareActivity((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->throttleResponse($e);
        }

        $data = $request->toArray();
        $activity = $this->activityRepository->find((int) ($data['activityId'] ?? 0));
        if (null === $activity) {
            return $this->json(['message' => 'Activité introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $receiver = isset($data['receiverId']) ? $this->userRepository->find((int) $data['receiverId']) : null;
        $group = isset($data['groupId']) ? $this->groupRepository->find((int) $data['groupId']) : null;
        $message = isset($data['message']) ? (string) $data['message'] : null;

        try {
            $shared = $this->sharedActivityService->share($user, $activity, $receiver, $group, $message);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $this->throttle->markActivityShared((int) $user->getId());
        $badges = $this->gamificationService->evaluateAndAward($user, GamificationEvent::ACTIVITY_SHARED, []);

        return $this->json([
            'sharedActivity' => $this->serializer->sharedActivityToArray($shared),
            'unlockedBadges' => $badges,
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_shared_activities_patch', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    public function markSeen(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $shared = $this->sharedActivityRepository->find($id);
        if (!$shared instanceof SharedActivity || !$this->sharedActivityService->userCanAccess($shared, $user)) {
            return $this->json(['message' => 'Partage introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $shared->setSeenAt(new \DateTimeImmutable());
        $this->em->flush();

        return $this->json(['sharedActivity' => $this->serializer->sharedActivityToArray($shared)]);
    }

    #[Route('/{id}', name: 'api_shared_activities_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $shared = $this->sharedActivityRepository->find($id);
        if (!$shared instanceof SharedActivity || !$this->sharedActivityService->userCanAccess($shared, $user)) {
            return $this->json(['message' => 'Partage introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $this->em->remove($shared);
        $this->em->flush();

        return $this->json(['message' => 'Supprimé.']);
    }

    private function requireUser(): User
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            throw $this->createAccessDeniedException();
        }

        return $user;
    }

    private function throttleResponse(ThrottledActionException $e): JsonResponse
    {
        return $this->json(
            ['message' => $e->getMessage(), 'retryAfterSeconds' => $e->getRetryAfterSeconds(), 'code' => 'RATE_LIMITED'],
            Response::HTTP_TOO_MANY_REQUESTS,
            ['Retry-After' => (string) $e->getRetryAfterSeconds()]
        );
    }
}
