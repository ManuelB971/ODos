<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\GroupInvitation;
use App\Entity\User;
use App\Repository\GroupInvitationRepository;
use App\Service\GroupService;
use App\Service\SocialSerializer;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/group-invitations')]
final class GroupInvitationController extends AbstractController
{
    private const PER_PAGE = 20;

    public function __construct(
        private readonly Security $security,
        private readonly GroupInvitationRepository $invitationRepository,
        private readonly GroupService $groupService,
        private readonly SocialSerializer $serializer,
    ) {
    }

    #[Route('', name: 'api_group_invitations_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $page = max(1, (int) $request->query->get('page', 1));
        $items = $this->invitationRepository->findPendingForUser($user, $page, self::PER_PAGE);

        return $this->json([
            'member' => array_map(fn (GroupInvitation $i) => $this->serializer->groupInvitationToArray($i), $items),
            'page' => $page,
            'itemsPerPage' => self::PER_PAGE,
        ]);
    }

    #[Route('/{id}/accept', name: 'api_group_invitations_accept', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function accept(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $invitation = $this->invitationRepository->find($id);
        if (!$invitation instanceof GroupInvitation) {
            return $this->json(['message' => 'Invitation introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $member = $this->groupService->acceptInvitation($user, $invitation);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json(['member' => $this->serializer->groupMemberToArray($member)]);
    }

    #[Route('/{id}/decline', name: 'api_group_invitations_decline', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function decline(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $invitation = $this->invitationRepository->find($id);
        if (!$invitation instanceof GroupInvitation) {
            return $this->json(['message' => 'Invitation introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->groupService->declineInvitation($user, $invitation);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json(['message' => 'Invitation refusée.']);
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
