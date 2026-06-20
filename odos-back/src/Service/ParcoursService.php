<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Activity;
use App\Entity\Parcours;
use App\Entity\ParcoursCollaborator;
use App\Entity\ParcoursItem;
use App\Entity\User;
use App\Enum\ParcoursVisibility;
use App\Repository\ParcoursCollaboratorRepository;
use App\Repository\ParcoursItemRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Logique métier des parcours (itinéraires collaboratifs).
 *
 * Accès = propriétaire OU collaborateur ({@see ParcoursCollaborator}). L'édition
 * (renommer, ajouter/retirer/réordonner une étape) est ouverte à tout utilisateur
 * ayant accès ; seul le propriétaire peut supprimer le parcours.
 */
final class ParcoursService
{
    private const TITLE_MAX = 120;
    private const DESC_MAX = 500;
    private const NOTE_MAX = 280;
    private const MAX_ITEMS = 50;

    public function __construct(
        private readonly ParcoursItemRepository $itemRepository,
        private readonly ParcoursCollaboratorRepository $collaboratorRepository,
        private readonly CommentContentSanitizer $sanitizer,
        private readonly FriendshipService $friendshipService,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public function isOwner(Parcours $parcours, User $user): bool
    {
        return $parcours->getOwner()?->getId() === $user->getId();
    }

    /**
     * Droit d'édition (= ancien « accès ») : propriétaire ou collaborateur.
     */
    public function canAccess(Parcours $parcours, User $user): bool
    {
        return $this->isOwner($parcours, $user) || $this->collaboratorRepository->exists($parcours, $user);
    }

    /**
     * Droit de consultation : un parcours public est lisible par tout utilisateur
     * connecté (lien partagé façon Spotify) ; un parcours privé reste réservé au
     * propriétaire et aux collaborateurs.
     */
    public function canView(Parcours $parcours, User $user): bool
    {
        return ParcoursVisibility::Public === $parcours->getVisibility() || $this->canAccess($parcours, $user);
    }

    public function assertAccess(Parcours $parcours, User $user): void
    {
        if (!$this->canAccess($parcours, $user)) {
            throw new \InvalidArgumentException('Accès refusé à ce parcours.');
        }
    }

    public function create(User $owner, string $title, ?string $description = null, ?ParcoursVisibility $visibility = null): Parcours
    {
        $title = $this->sanitizer->sanitize(trim($title));
        if (mb_strlen($title) < 2 || mb_strlen($title) > self::TITLE_MAX) {
            throw new \InvalidArgumentException('Titre de parcours invalide.');
        }

        $parcours = new Parcours();
        $parcours->setOwner($owner);
        $parcours->setTitle($title);
        $parcours->setDescription($this->cleanDescription($description));
        if (null !== $visibility) {
            $parcours->setVisibility($visibility);
        }

        $this->em->persist($parcours);
        $this->em->flush();

        return $parcours;
    }

    public function rename(Parcours $parcours, ?string $title, ?string $description, ?ParcoursVisibility $visibility = null): void
    {
        if (null !== $title) {
            $title = $this->sanitizer->sanitize(trim($title));
            if (mb_strlen($title) < 2 || mb_strlen($title) > self::TITLE_MAX) {
                throw new \InvalidArgumentException('Titre de parcours invalide.');
            }
            $parcours->setTitle($title);
        }
        if (null !== $description) {
            $parcours->setDescription($this->cleanDescription($description));
        }
        if (null !== $visibility) {
            $parcours->setVisibility($visibility);
        }

        $parcours->touch();
        $this->em->flush();
    }

    public function addItem(Parcours $parcours, Activity $activity, ?string $note = null): ParcoursItem
    {
        if ($parcours->getItemCount() >= self::MAX_ITEMS) {
            throw new \InvalidArgumentException('Ce parcours a atteint la limite d\'étapes.');
        }

        $item = new ParcoursItem();
        $item->setParcours($parcours);
        $item->setActivity($activity);
        $item->setPosition($this->itemRepository->maxPosition($parcours) + 1);
        $item->setNote($this->cleanNote($note));

        $parcours->setItemCount($parcours->getItemCount() + 1);
        $parcours->touch();

        $this->em->persist($item);
        $this->em->flush();

        return $item;
    }

    public function removeItem(Parcours $parcours, ParcoursItem $item): void
    {
        if ($item->getParcours()?->getId() !== $parcours->getId()) {
            throw new \InvalidArgumentException('Étape introuvable dans ce parcours.');
        }

        $this->em->remove($item);
        $parcours->setItemCount($parcours->getItemCount() - 1);
        $parcours->touch();
        $this->em->flush();
    }

    /**
     * Réordonne les étapes selon la liste d'IDs fournie. Les IDs absents gardent
     * leur ordre relatif à la fin.
     *
     * @param int[] $orderedItemIds
     */
    public function reorder(Parcours $parcours, array $orderedItemIds): void
    {
        $items = $this->itemRepository->findOrdered($parcours);
        /** @var array<int, ParcoursItem> $byId */
        $byId = [];
        foreach ($items as $item) {
            $id = $item->getId();
            if (null !== $id) {
                $byId[$id] = $item;
            }
        }

        $position = 0;
        foreach ($orderedItemIds as $id) {
            $id = (int) $id;
            if (isset($byId[$id])) {
                $byId[$id]->setPosition($position++);
                unset($byId[$id]);
            }
        }
        // Étapes non citées : conservées à la suite.
        foreach ($byId as $item) {
            $item->setPosition($position++);
        }

        $parcours->touch();
        $this->em->flush();
    }

    /**
     * Ajoute un collaborateur (idempotent). La co-édition est réservée aux **amis**
     * du propriétaire : on ne peut inviter en collaboration que quelqu'un avec qui
     * on est ami (cf. invitation explicite, découplée du simple partage de carte).
     */
    public function addCollaborator(Parcours $parcours, User $user): void
    {
        if ($this->isOwner($parcours, $user) || $this->collaboratorRepository->exists($parcours, $user)) {
            return;
        }

        $owner = $parcours->getOwner();
        if (!$owner instanceof User || !$this->friendshipService->areFriends($owner, $user)) {
            throw new \InvalidArgumentException('La co-édition est réservée à vos amis.');
        }

        $collaborator = new ParcoursCollaborator();
        $collaborator->setParcours($parcours);
        $collaborator->setUser($user);

        $this->em->persist($collaborator);
        $this->em->flush();
    }

    /**
     * Retire un collaborateur (sans effet s'il n'en est pas un). Les étapes qu'il a
     * ajoutées restent dans le parcours.
     */
    public function removeCollaborator(Parcours $parcours, User $user): void
    {
        $collaborator = $this->collaboratorRepository->findCollaborator($parcours, $user);
        if (null !== $collaborator) {
            $this->em->remove($collaborator);
            $this->em->flush();
        }
    }

    public function delete(Parcours $parcours, User $user): void
    {
        if (!$this->isOwner($parcours, $user)) {
            throw new \InvalidArgumentException('Seul le créateur peut supprimer ce parcours.');
        }

        $this->em->remove($parcours);
        $this->em->flush();
    }

    private function cleanDescription(?string $value): ?string
    {
        if (null === $value) {
            return null;
        }
        $value = $this->sanitizer->sanitize(trim($value));

        return '' === $value ? null : mb_substr($value, 0, self::DESC_MAX);
    }

    private function cleanNote(?string $value): ?string
    {
        if (null === $value) {
            return null;
        }
        $value = $this->sanitizer->sanitize(trim($value));

        return '' === $value ? null : mb_substr($value, 0, self::NOTE_MAX);
    }
}
