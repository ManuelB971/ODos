<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Friendship;
use App\Entity\User;
use App\Repository\FriendshipRepository;
use App\Repository\UserRepository;
use App\Service\FriendshipService;
use App\Service\SocialSerializer;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/users')]
final class UserBlockController extends AbstractController
{
    private const PER_PAGE = 50;

    public function __construct(
        private readonly Security $security,
        private readonly UserRepository $userRepository,
        private readonly FriendshipRepository $friendshipRepository,
        private readonly FriendshipService $friendshipService,
        private readonly SocialSerializer $serializer,
    ) {
    }

    #[Route('/blocked', name: 'api_users_blocked_list', methods: ['GET'])]
    public function listBlocked(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $page = max(1, (int) $request->query->get('page', 1));
        $items = $this->friendshipRepository->findBlockedByUser($user, $page, self::PER_PAGE);

        $member = array_values(array_filter(array_map(
            fn (Friendship $f): ?array => $this->serializer->userSnippet($f->getReceiver()),
            $items,
        )));

        return $this->json([
            'member' => $member,
            'page' => $page,
            'itemsPerPage' => self::PER_PAGE,
        ]);
    }

    #[Route('/{id}/block', name: 'api_users_block', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function block(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $target = $this->userRepository->find($id);
        if (!$target instanceof User) {
            return $this->json(['message' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if ($target->getId() === $user->getId()) {
            return $this->json(['message' => 'Vous ne pouvez pas vous bloquer.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $this->friendshipService->block($user, $target);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json(['message' => 'Utilisateur bloqué.', 'blocked' => true]);
    }

    #[Route('/{id}/block', name: 'api_users_unblock', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function unblock(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $target = $this->userRepository->find($id);
        if (!$target instanceof User) {
            return $this->json(['message' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->friendshipService->unblock($user, $target);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json(['message' => 'Utilisateur débloqué.', 'blocked' => false]);
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
}
