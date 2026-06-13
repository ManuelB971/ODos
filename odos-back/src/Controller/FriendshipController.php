<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Friendship;
use App\Entity\User;
use App\Gamification\GamificationEvent;
use App\Gamification\GamificationService;
use App\Repository\FriendshipRepository;
use App\Repository\UserRepository;
use App\Service\FriendshipService;
use App\Service\PushNotificationService;
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

#[Route('/api/friendships')]
final class FriendshipController extends AbstractController
{
    private const PER_PAGE = 20;

    public function __construct(
        private readonly Security $security,
        private readonly FriendshipRepository $friendshipRepository,
        private readonly UserRepository $userRepository,
        private readonly FriendshipService $friendshipService,
        private readonly SocialSerializer $serializer,
        private readonly UserActionThrottleService $throttle,
        private readonly EntityManagerInterface $em,
        private readonly GamificationService $gamificationService,
        private readonly PushNotificationService $pushNotificationService,
    ) {
    }

    #[Route('', name: 'api_friendships_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $user = $this->requireUser();

        $page = max(1, (int) $request->query->get('page', 1));
        $items = $this->friendshipRepository->findForUser($user, $page, self::PER_PAGE);
        $member = array_map(fn (Friendship $f) => $this->serializer->friendshipToArray($f, $user), $items);

        return $this->json([
            'member' => $member,
            'page' => $page,
            'itemsPerPage' => self::PER_PAGE,
        ]);
    }

    #[Route('', name: 'api_friendships_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->requireUser();

        try {
            $this->throttle->assertCanSendFriendRequest((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->throttleResponse($e);
        }

        $data = $request->toArray();
        $receiverId = (int) ($data['receiverId'] ?? 0);
        $receiver = $this->userRepository->find($receiverId);
        if (!$receiver instanceof User) {
            return $this->json(['message' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $friendship = $this->friendshipService->sendRequest($user, $receiver);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $this->throttle->markFriendRequestSent((int) $user->getId());
        $badges = $this->gamificationService->evaluateAndAward($user, GamificationEvent::FRIEND_REQUEST_SENT, []);
        $this->pushNotificationService->notifyUser(
            $receiver,
            'Nouvelle demande d\'ami',
            $user->getDisplayName().' souhaite vous ajouter.',
            ['type' => 'friend_request'],
        );

        return $this->json([
            'friendship' => $this->serializer->friendshipToArray($friendship, $user),
            'unlockedBadges' => $badges,
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_friendships_patch', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    public function patch(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $friendship = $this->friendshipRepository->find($id);
        if (!$friendship instanceof Friendship) {
            return $this->json(['message' => 'Demande introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if (!$this->isParticipant($friendship, $user)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $status = (string) ($request->toArray()['status'] ?? '');
        if ($friendship->getReceiver()?->getId() !== $user->getId()) {
            return $this->json(['message' => 'Seul le destinataire peut accepter ou bloquer.'], Response::HTTP_FORBIDDEN);
        }

        if ('accepted' === $status) {
            $sender = $friendship->getSender();
            try {
                $this->friendshipService->acceptRequest($friendship);
            } catch (\InvalidArgumentException $e) {
                return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
            }
            $badges = $this->gamificationService->evaluateAndAward($user, GamificationEvent::FRIEND_ACCEPTED, []);
            if ($sender instanceof User) {
                $badges = array_merge(
                    $badges,
                    $this->gamificationService->evaluateAndAward($sender, GamificationEvent::FRIEND_ACCEPTED, []),
                );
            }
        } elseif ('blocked' === $status) {
            $blocked = $friendship->getSender();
            if ($blocked instanceof User) {
                $friendship = $this->friendshipService->block($user, $blocked);
            }
            $badges = [];
        } else {
            return $this->json(['message' => 'Statut invalide.'], Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'friendship' => $this->serializer->friendshipToArray($friendship, $user),
            'unlockedBadges' => $badges ?? [],
        ]);
    }

    #[Route('/{id}', name: 'api_friendships_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $friendship = $this->friendshipRepository->find($id);
        if (!$friendship instanceof Friendship) {
            return $this->json(['message' => 'Demande introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if (!$this->isParticipant($friendship, $user)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $this->em->remove($friendship);
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

    private function isParticipant(Friendship $friendship, User $user): bool
    {
        $uid = $user->getId();

        return $friendship->getSender()?->getId() === $uid || $friendship->getReceiver()?->getId() === $uid;
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
