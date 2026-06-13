<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\ActivityGroup;
use App\Entity\GroupMember;
use App\Entity\User;
use App\Enum\GroupRole;
use App\Gamification\GamificationEvent;
use App\Gamification\GamificationService;
use App\Repository\ActivityGroupRepository;
use App\Repository\GroupMemberRepository;
use App\Service\CommentContentSanitizer;
use App\Service\GroupService;
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
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

#[Route('/api/groups')]
final class GroupController extends AbstractController
{
    private const PER_PAGE = 20;

    public function __construct(
        private readonly Security $security,
        private readonly ActivityGroupRepository $groupRepository,
        private readonly GroupMemberRepository $groupMemberRepository,
        private readonly GroupService $groupService,
        private readonly SocialSerializer $serializer,
        private readonly CommentContentSanitizer $sanitizer,
        private readonly UserActionThrottleService $throttle,
        private readonly EntityManagerInterface $em,
        private readonly GamificationService $gamificationService,
        private readonly EventDispatcherInterface $eventDispatcher,
    ) {
    }

    #[Route('', name: 'api_groups_list', methods: ['GET'])]
    public function list(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $page = max(1, (int) $request->query->get('page', 1));
        $tab = (string) $request->query->get('tab', 'mine');

        if ('discover' === $tab) {
            $items = $this->groupRepository->findPublicDiscovery($page, self::PER_PAGE);

            return $this->json([
                'member' => array_map(fn (ActivityGroup $g) => $this->serializer->groupToArray($g), $items),
                'totalItems' => $this->groupRepository->countPublicDiscovery(),
                'page' => $page,
                'itemsPerPage' => self::PER_PAGE,
            ]);
        }

        $items = $this->groupRepository->findByMember($user, $page, self::PER_PAGE);

        return $this->json([
            'member' => array_map(fn (ActivityGroup $g) => $this->serializer->groupToArray($g), $items),
            'page' => $page,
            'itemsPerPage' => self::PER_PAGE,
        ]);
    }

    #[Route('/{id}', name: 'api_groups_show', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function show(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $group = $this->groupRepository->find($id);
        if (!$group instanceof ActivityGroup) {
            return $this->json(['message' => 'Groupe introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if ($group->isPrivate() && !$this->groupService->isMember($user, $group)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $members = $this->groupMemberRepository->findForGroup($group);

        return $this->json([
            'group' => $this->serializer->groupToArray($group),
            'members' => array_map(fn (GroupMember $m) => $this->serializer->groupMemberToArray($m), $members),
        ]);
    }

    #[Route('', name: 'api_groups_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->requireUser();

        try {
            $this->throttle->assertCanCreateGroup((int) $user->getId());
        } catch (ThrottledActionException $e) {
            return $this->throttleResponse($e);
        }

        $data = $request->toArray();
        $name = $this->sanitizer->sanitize((string) ($data['name'] ?? ''));
        if ('' === trim($name)) {
            return $this->json(['message' => 'Nom requis.'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $group = $this->groupService->create(
                $user,
                $name,
                isset($data['description']) ? (string) $data['description'] : null,
                (bool) ($data['isPrivate'] ?? false),
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $this->throttle->markGroupCreated((int) $user->getId());
        $badges = $this->gamificationService->evaluateAndAward($user, GamificationEvent::GROUP_JOINED, []);

        return $this->json([
            'group' => $this->serializer->groupToArray($group),
            'unlockedBadges' => $badges,
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_groups_patch', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    public function patch(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $group = $this->groupRepository->find($id);
        if (!$group instanceof ActivityGroup || !$this->groupService->hasRole($user, $group, GroupRole::Admin)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $data = $request->toArray();
        if (isset($data['name'])) {
            $group->setName($this->sanitizer->sanitize(mb_substr((string) $data['name'], 0, 100)));
        }
        if (array_key_exists('description', $data)) {
            $group->setDescription(null !== $data['description']
                ? $this->sanitizer->sanitize(mb_substr((string) $data['description'], 0, 500))
                : null);
        }
        if (isset($data['avatarUrl'])) {
            $group->setAvatarUrl((string) $data['avatarUrl']);
        }

        $this->em->flush();

        return $this->json(['group' => $this->serializer->groupToArray($group)]);
    }

    #[Route('/{id}', name: 'api_groups_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $group = $this->groupRepository->find($id);
        if (!$group instanceof ActivityGroup || !$this->groupService->hasRole($user, $group, GroupRole::Creator)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $this->em->remove($group);
        $this->em->flush();

        return $this->json(['message' => 'Supprimé.']);
    }

    #[Route('/{id}/join', name: 'api_groups_join', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function join(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $group = $this->groupRepository->find($id);
        if (!$group instanceof ActivityGroup) {
            return $this->json(['message' => 'Groupe introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $member = $this->groupService->join($user, $group);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        $badges = $this->gamificationService->evaluateAndAward($user, GamificationEvent::GROUP_JOINED, []);

        return $this->json([
            'member' => $this->serializer->groupMemberToArray($member),
            'unlockedBadges' => $badges,
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}/invite', name: 'api_groups_invite', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function invite(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $group = $this->groupRepository->find($id);
        if (!$group instanceof ActivityGroup) {
            return $this->json(['message' => 'Groupe introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $inviteeId = (int) ($request->toArray()['userId'] ?? 0);
        $invitee = $this->em->getRepository(User::class)->find($inviteeId);
        if (!$invitee instanceof User) {
            return $this->json(['message' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $invitation = $this->groupService->invite($user, $group, $invitee);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json([
            'invitation' => $this->serializer->groupInvitationToArray($invitation),
        ], Response::HTTP_CREATED);
    }

    #[Route('/{id}/leave', name: 'api_groups_leave', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function leave(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $group = $this->groupRepository->find($id);
        if (!$group instanceof ActivityGroup) {
            return $this->json(['message' => 'Groupe introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->groupService->leave($user, $group);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json(['message' => 'Groupe quitté.']);
    }

    #[Route('/{id}/members/{userId}', name: 'api_groups_member_patch', methods: ['PATCH'], requirements: ['id' => '\d+', 'userId' => '\d+'])]
    public function patchMember(int $id, int $userId, Request $request): JsonResponse
    {
        $actor = $this->requireUser();
        $group = $this->groupRepository->find($id);
        if (!$group instanceof ActivityGroup || !$this->groupService->hasRole($actor, $group, GroupRole::Admin)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $target = $this->em->getRepository(User::class)->find($userId);
        if (!$target instanceof User) {
            return $this->json(['message' => 'Membre introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $membership = $this->groupMemberRepository->findMembership($target, $group);
        if (null === $membership) {
            return $this->json(['message' => 'Membre introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if (GroupRole::Creator === $membership->getRole()) {
            return $this->json(['message' => 'Impossible de modifier le créateur.'], Response::HTTP_BAD_REQUEST);
        }

        if (!$this->groupService->canManageMember($actor, $group, $membership)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $role = GroupRole::tryFrom((string) ($request->toArray()['role'] ?? ''));
        if (null === $role) {
            return $this->json(['message' => 'Rôle invalide.'], Response::HTTP_BAD_REQUEST);
        }

        if (!$this->groupService->canAssignRole($actor, $group, $membership, $role)) {
            return $this->json(['message' => 'Modification de rôle non autorisée.'], Response::HTTP_FORBIDDEN);
        }

        $membership->setRole($role);
        $this->em->flush();

        return $this->json(['member' => $this->serializer->groupMemberToArray($membership)]);
    }

    #[Route('/{id}/members/{userId}', name: 'api_groups_member_delete', methods: ['DELETE'], requirements: ['id' => '\d+', 'userId' => '\d+'])]
    public function removeMember(int $id, int $userId): JsonResponse
    {
        $actor = $this->requireUser();
        $group = $this->groupRepository->find($id);
        if (!$group instanceof ActivityGroup || !$this->groupService->hasRole($actor, $group, GroupRole::Admin)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $target = $this->em->getRepository(User::class)->find($userId);
        if (!$target instanceof User) {
            return $this->json(['message' => 'Membre introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $membership = $this->groupMemberRepository->findMembership($target, $group);
        if (null === $membership) {
            return $this->json(['message' => 'Membre introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if (GroupRole::Creator === $membership->getRole()) {
            return $this->json(['message' => 'Impossible d\'exclure le créateur.'], Response::HTTP_BAD_REQUEST);
        }

        if (!$this->groupService->canManageMember($actor, $group, $membership)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $this->em->remove($membership);
        $this->em->flush();
        $this->eventDispatcher->dispatch(new \App\Event\GroupMemberLeftEvent($group));

        return $this->json(['message' => 'Membre exclu.']);
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
