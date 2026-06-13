<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\ActivityGroup;
use App\Entity\GroupInvitation;
use App\Entity\GroupMember;
use App\Entity\User;
use App\Enum\GroupInvitationStatus;
use App\Enum\GroupRole;
use App\Event\GroupMemberJoinedEvent;
use App\Event\GroupMemberLeftEvent;
use App\Repository\GroupInvitationRepository;
use App\Repository\GroupMemberRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

final class GroupService
{
    public const MAX_MEMBERS = 50;
    public const MAX_GROUPS_PER_USER = 10;

    public function __construct(
        private readonly GroupMemberRepository $groupMemberRepository,
        private readonly GroupInvitationRepository $groupInvitationRepository,
        private readonly EntityManagerInterface $em,
        private readonly CommentContentSanitizer $sanitizer,
        private readonly EventDispatcherInterface $eventDispatcher,
        private readonly PushNotificationService $pushNotificationService,
    ) {
    }

    public function create(User $creator, string $name, ?string $description = null, bool $isPrivate = false): ActivityGroup
    {
        if ($this->groupMemberRepository->countForUser($creator) >= self::MAX_GROUPS_PER_USER) {
            throw new \InvalidArgumentException('Limite de groupes atteinte (10 maximum).');
        }

        $group = new ActivityGroup();
        $group->setName($this->sanitizer->sanitize(mb_substr($name, 0, 100)));
        $group->setDescription(null !== $description ? $this->sanitizer->sanitize(mb_substr($description, 0, 500)) : null);
        $group->setIsPrivate($isPrivate);
        $group->setCreatedBy($creator);
        $group->setMemberCount(1);

        $member = new GroupMember();
        $member->setGroup($group);
        $member->setUser($creator);
        $member->setRole(GroupRole::Creator);

        $this->em->persist($group);
        $this->em->persist($member);
        $this->em->flush();

        return $group;
    }

    public function join(User $user, ActivityGroup $group): GroupMember
    {
        if (!$this->canJoin($user, $group)) {
            throw new \InvalidArgumentException('Impossible de rejoindre ce groupe.');
        }

        if ($group->isPrivate()) {
            $invitation = $this->groupInvitationRepository->findPendingForUserAndGroup($user, $group);
            if (null === $invitation) {
                throw new \InvalidArgumentException('Ce groupe est privé : une invitation est requise.');
            }

            return $this->acceptInvitation($user, $invitation);
        }

        return $this->addMember($user, $group);
    }

    public function invite(User $inviter, ActivityGroup $group, User $invitee): GroupInvitation
    {
        if (!$group->isPrivate()) {
            throw new \InvalidArgumentException('Les invitations ne sont possibles que pour les groupes privés.');
        }

        if (!$this->hasRole($inviter, $group, GroupRole::Admin)) {
            throw new \InvalidArgumentException('Seuls les admins peuvent inviter.');
        }

        if ($this->isMember($invitee, $group)) {
            throw new \InvalidArgumentException('Cet utilisateur est déjà membre.');
        }

        if (!$this->canJoin($invitee, $group)) {
            throw new \InvalidArgumentException('Cet utilisateur ne peut pas rejoindre ce groupe.');
        }

        $existing = $this->groupInvitationRepository->findForUserAndGroup($invitee, $group);
        if (null !== $existing) {
            if (GroupInvitationStatus::Pending === $existing->getStatus()) {
                return $existing;
            }

            $existing->setStatus(GroupInvitationStatus::Pending);
            $existing->setInvitedBy($inviter);
            $existing->setCreatedAt(new \DateTimeImmutable());
            $this->em->flush();
            $this->notifyInvitee($invitee, $group);

            return $existing;
        }

        $invitation = new GroupInvitation();
        $invitation->setGroup($group);
        $invitation->setInvitee($invitee);
        $invitation->setInvitedBy($inviter);

        $this->em->persist($invitation);
        $this->em->flush();
        $this->notifyInvitee($invitee, $group);

        return $invitation;
    }

    private function notifyInvitee(User $invitee, ActivityGroup $group): void
    {
        $this->pushNotificationService->notifyUser(
            $invitee,
            'Invitation groupe',
            'Vous êtes invité à rejoindre « '.$group->getName().' ».',
            ['type' => 'group_invitation', 'groupId' => $group->getId()],
        );
    }

    public function acceptInvitation(User $user, GroupInvitation $invitation): GroupMember
    {
        if ($invitation->getInvitee()?->getId() !== $user->getId()) {
            throw new \InvalidArgumentException('Invitation invalide.');
        }

        if (GroupInvitationStatus::Pending !== $invitation->getStatus()) {
            throw new \InvalidArgumentException('Cette invitation n\'est plus valide.');
        }

        $group = $invitation->getGroup();
        if (null === $group) {
            throw new \InvalidArgumentException('Groupe introuvable.');
        }

        if (!$this->canJoin($user, $group)) {
            throw new \InvalidArgumentException('Impossible de rejoindre ce groupe.');
        }

        $invitation->setStatus(GroupInvitationStatus::Accepted);
        $member = $this->addMember($user, $group);
        $this->em->flush();

        return $member;
    }

    public function declineInvitation(User $user, GroupInvitation $invitation): void
    {
        if ($invitation->getInvitee()?->getId() !== $user->getId()) {
            throw new \InvalidArgumentException('Invitation invalide.');
        }

        $invitation->setStatus(GroupInvitationStatus::Declined);
        $this->em->flush();
    }

    private function addMember(User $user, ActivityGroup $group): GroupMember
    {
        $member = new GroupMember();
        $member->setGroup($group);
        $member->setUser($user);
        $member->setRole(GroupRole::Member);

        $this->em->persist($member);
        $this->em->flush();

        $this->eventDispatcher->dispatch(new GroupMemberJoinedEvent($group));

        return $member;
    }

    public function leave(User $user, ActivityGroup $group): void
    {
        $membership = $this->groupMemberRepository->findMembership($user, $group);
        if (null === $membership) {
            throw new \InvalidArgumentException('Vous n\'êtes pas membre de ce groupe.');
        }

        if (GroupRole::Creator === $membership->getRole()) {
            throw new \InvalidArgumentException('Le créateur ne peut pas quitter le groupe.');
        }

        $this->em->remove($membership);
        $this->em->flush();

        $this->eventDispatcher->dispatch(new GroupMemberLeftEvent($group));
    }

    public function isMember(User $user, ActivityGroup $group): bool
    {
        return null !== $this->groupMemberRepository->findMembership($user, $group);
    }

    public function hasRole(User $user, ActivityGroup $group, GroupRole $minRole): bool
    {
        $membership = $this->groupMemberRepository->findMembership($user, $group);
        if (null === $membership) {
            return false;
        }

        return $membership->getRole()->isAtLeast($minRole);
    }

    public function canJoin(User $user, ActivityGroup $group): bool
    {
        if ($this->isMember($user, $group)) {
            return false;
        }

        if ($group->getMemberCount() >= self::MAX_MEMBERS) {
            return false;
        }

        if ($this->groupMemberRepository->countForUser($user) >= self::MAX_GROUPS_PER_USER) {
            return false;
        }

        return true;
    }

    public function canManageMember(User $actor, ActivityGroup $group, GroupMember $target): bool
    {
        if (GroupRole::Creator === $target->getRole()) {
            return false;
        }

        $actorMembership = $this->groupMemberRepository->findMembership($actor, $group);
        if (null === $actorMembership || !$actorMembership->getRole()->isAtLeast(GroupRole::Admin)) {
            return false;
        }

        if (GroupRole::Creator === $actorMembership->getRole()) {
            return true;
        }

        return GroupRole::Member === $target->getRole();
    }

    public function canAssignRole(User $actor, ActivityGroup $group, GroupMember $target, GroupRole $newRole): bool
    {
        if (GroupRole::Creator === $newRole || !$this->canManageMember($actor, $group, $target)) {
            return false;
        }

        $actorMembership = $this->groupMemberRepository->findMembership($actor, $group);
        if (null === $actorMembership) {
            return false;
        }

        if (GroupRole::Creator === $actorMembership->getRole()) {
            return true;
        }

        return GroupRole::Member === $newRole && GroupRole::Member === $target->getRole();
    }
}
