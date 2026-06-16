<?php

declare(strict_types=1);

namespace App\Entity;

use App\Repository\ParcoursItemRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * Étape d'un parcours : une activité à une position donnée, avec note optionnelle.
 * Supprimée en cascade si le parcours OU l'activité disparaît (une étape sans
 * activité n'a pas de sens pour un itinéraire).
 */
#[ORM\Entity(repositoryClass: ParcoursItemRepository::class)]
#[ORM\Table(name: 'parcours_item')]
#[ORM\Index(name: 'idx_parcours_item_position', columns: ['parcours_id', 'position'])]
class ParcoursItem
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
    private ?Activity $activity = null;

    #[ORM\Column(options: ['default' => 0])]
    private int $position = 0;

    #[ORM\Column(length: 280, nullable: true)]
    private ?string $note = null;

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

    public function getActivity(): ?Activity
    {
        return $this->activity;
    }

    public function setActivity(?Activity $activity): static
    {
        $this->activity = $activity;

        return $this;
    }

    public function getPosition(): int
    {
        return $this->position;
    }

    public function setPosition(int $position): static
    {
        $this->position = $position;

        return $this;
    }

    public function getNote(): ?string
    {
        return $this->note;
    }

    public function setNote(?string $note): static
    {
        $this->note = $note;

        return $this;
    }
}
