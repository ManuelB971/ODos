<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ParcoursCollaboratorRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Lien d'édition collaborative : un utilisateur (autre que le propriétaire)
 * autorisé à voir et modifier un parcours. Peuplé quand un parcours est partagé
 * dans une conversation (cf. ChatService, phase 3).
 */
#[ORM\Entity(repositoryClass: ParcoursCollaboratorRepository::class)]
#[ORM\Table(name: 'parcours_collaborator')]
#[ORM\UniqueConstraint(name: 'uniq_parcours_collaborator', columns: ['parcours_id', 'user_id'])]
#[ORM\Index(name: 'idx_parcours_collaborator_user', columns: ['user_id'])]
class ParcoursCollaborator
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private int $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Parcours $parcours = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?User $user = null;

    #[ORM\Column(type: Types::DATETIME_IMMUTABLE)]
    private \DateTimeImmutable $addedAt;

    public function __construct()
    {
        $this->addedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return isset($this->id) ? $this->id : null;
    }

    public function getParcours(): ?Parcours
    {
        return $this->parcours;
    }

    public function setParcours(?Parcours $parcours): static
    {
        $this->parcours = $parcours;

        return $this;
    }

    public function getUser(): ?User
    {
        return $this->user;
    }

    public function setUser(?User $user): static
    {
        $this->user = $user;

        return $this;
    }

    public function getAddedAt(): \DateTimeImmutable
    {
        return $this->addedAt;
    }
}
