<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Get;
use ApiPlatform\Metadata\GetCollection;
use ApiPlatform\Metadata\Patch;
use ApiPlatform\Metadata\Post;
use App\Repository\UserRepository;
use App\State\MeStateProvider;
use App\State\UserPasswordHasherProcessor;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Serializer\Annotation\Groups;
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity(repositoryClass: UserRepository::class)]
#[ORM\Table(name: '`user`')]
#[ORM\UniqueConstraint(name: 'UNIQ_IDENTIFIER_EMAIL', fields: ['email'])]
#[UniqueEntity(fields: ['email'], message: 'Cet email est déjà lié à un compte existant.')]
#[ApiResource(
    operations: [
        new GetCollection(security: "is_granted('ROLE_ADMIN')"),
        new Get(
            uriTemplate: '/me',
            security: "is_granted('ROLE_USER')",
            name: 'api_me',
            provider: MeStateProvider::class
        ),
        new Get(security: "is_granted('ROLE_ADMIN') or object == user"),
        new Post(processor: UserPasswordHasherProcessor::class),
        new Patch(
            security: "is_granted('ROLE_ADMIN') or object == user",
            processor: UserPasswordHasherProcessor::class
        ),
        new Delete(security: "is_granted('ROLE_ADMIN') or object == user"),
    ],
    normalizationContext: ['groups' => ['user:read']],
    denormalizationContext: ['groups' => ['user:write']]
)]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    #[Groups(['user:read'])]
    private int $id;

    #[ORM\Column(length: 180)]
    #[Groups(['user:read', 'user:write'])]
    #[Assert\NotBlank(message: 'L\'adresse email est obligatoire.')]
    #[Assert\Email(message: 'L\'adresse email {{ value }} n\'est pas valide.')]
    private ?string $email = null;

    /** Horodatage du consentement CGU + politique de confidentialité (art. 7 RGPD). */
    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    #[Groups(['user:read'])]
    private ?\DateTimeImmutable $consentedAt = null;

    #[ORM\Column(length: 32, nullable: true)]
    #[Groups(['user:read', 'user:write'])]
    private ?string $phoneNumber = null;

    /**
     * Alias / pseudo public de l'utilisateur (affiché à la place de l'email).
     *
     * Contraintes de sécurité :
     * - Longueur maxi 60 (cohérent avec la colonne).
     * - Regex ASCII-lettres + chiffres + espaces + tirets / underscores / apostrophes /
     *   points, pour éviter tout contenu interprétable (balises, unicode de contrôle…).
     */
    #[ORM\Column(length: 60, nullable: true)]
    #[Groups(['user:read', 'user:write'])]
    #[Assert\Length(
        min: 2,
        max: 60,
        minMessage: "L'alias doit contenir au moins {{ limit }} caractères.",
        maxMessage: "L'alias ne peut pas dépasser {{ limit }} caractères."
    )]
    #[Assert\Regex(
        pattern: "/^[\p{L}\p{N}\s\-_'.]+$/u",
        message: "L'alias contient des caractères non autorisés."
    )]
    private ?string $alias = null;

    /**
     * URL publique de l'avatar utilisateur (ex. /uploads/avatars/xxx.webp).
     *
     * Cette valeur est écrite uniquement via {@see \App\Controller\UserAvatarController}
     * après upload contrôlé (whitelist MIME, taille max, nom randomisé).
     * Le client ne doit jamais pouvoir la setter directement → retirée du groupe `user:write`.
     */
    #[ORM\Column(length: 512, nullable: true)]
    #[Groups(['user:read'])]
    private ?string $avatarUrl = null;

    /**
     * Bio publique affichée sur le profil.
     *
     * Contraintes de sécurité :
     * - Max 500 caractères (colonne TEXT).
     * - Strip HTML dans le setter → protection XSS même si le front ne sanitize pas.
     * - Regex interdit `<` et `>` (double filet de sécurité, empêche aussi les balises
     *   encodées via \u003c côté API si un décodeur les ré-injecte).
     */
    #[ORM\Column(type: 'text', nullable: true)]
    #[Groups(['user:read', 'user:write'])]
    #[Assert\Length(
        max: 500,
        maxMessage: 'La bio ne peut pas dépasser {{ limit }} caractères.'
    )]
    #[Assert\Regex(
        pattern: '/<|>/',
        match: false,
        message: 'La bio ne peut pas contenir de balises HTML.'
    )]
    private ?string $bio = null;

    /**
     * @var list<string> The user roles
     */
    #[ORM\Column]
    #[Groups(['user:read'])]
    private array $roles = [];

    /**
     * @var string The hashed password
     */
    #[ORM\Column]
    private ?string $password = null;

    #[ORM\Column(length: 255, nullable: true, unique: true)]
    private ?string $googleId = null;

    #[ORM\Column(length: 255, nullable: true, unique: true)]
    private ?string $appleId = null;

    #[ORM\Column(length: 64, nullable: true)]
    private ?string $passwordResetTokenHash = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $passwordResetExpiresAt = null;

    #[Groups(['user:write'])]
    #[Assert\Length(
        min: 8,
        minMessage: 'Le mot de passe doit faire au moins {{ limit }} caractères.',
        max: 4096
    )]
    #[Assert\Regex(
        pattern: '/^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[@$!%*?&]).+$/',
        message: 'Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial.'
    )]
    private ?string $plainPassword = null;

    /**
     * @var Collection<int, Category>
     */
    #[ORM\ManyToMany(targetEntity: Category::class, inversedBy: 'users')]
    #[Groups(['user:read', 'user:write'])]
    private Collection $interests;

    /**
     * @var Collection<int, Activity>
     */
    #[ORM\ManyToMany(targetEntity: Activity::class, inversedBy: 'favoritedBy')]
    #[ORM\JoinTable(name: 'user_favorite_activity')]
    #[Groups(['user:read'])]
    private Collection $favorites;

    /**
     * @var Collection<int, AdminWebauthnCredential>
     */
    #[ORM\OneToMany(mappedBy: 'user', targetEntity: AdminWebauthnCredential::class, orphanRemoval: true)]
    private Collection $webauthnCredentials;

    /**
     * @var Collection<int, Comment>
     */
    #[ORM\OneToMany(targetEntity: Comment::class, mappedBy: 'author')]
    private Collection $authoredComments;

    /**
     * @var Collection<int, ActivityRating>
     */
    #[ORM\OneToMany(targetEntity: ActivityRating::class, mappedBy: 'user', orphanRemoval: true)]
    private Collection $activityRatings;

    /** Masque tous les badges sur le profil public (préférence utilisateur). */
    #[ORM\Column(options: ['default' => false])]
    #[Groups(['user:read', 'user:write'])]
    private bool $hideBadgesOnProfile = false;

    /** Consentement RGPD pour le suivi GPS d'exploration carte (phase D). */
    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $mapExplorationConsentAt = null;

    /** Interrupteur paramètres : désactivé = pas de GPS, sync ni progression badges carte. */
    #[ORM\Column(options: ['default' => false])]
    #[Groups(['user:read', 'user:write'])]
    private bool $mapExplorationEnabled = false;

    /**
     * @var Collection<int, UserBadge>
     */
    #[ORM\OneToMany(targetEntity: UserBadge::class, mappedBy: 'user', orphanRemoval: true)]
    private Collection $userBadges;

    /**
     * @var Collection<int, UserBadgeDisplay>
     */
    #[ORM\OneToMany(targetEntity: UserBadgeDisplay::class, mappedBy: 'user', orphanRemoval: true)]
    private Collection $badgeDisplays;

    public function __construct()
    {
        $this->interests = new ArrayCollection();
        $this->favorites = new ArrayCollection();
        $this->webauthnCredentials = new ArrayCollection();
        $this->authoredComments = new ArrayCollection();
        $this->activityRatings = new ArrayCollection();
        $this->userBadges = new ArrayCollection();
        $this->badgeDisplays = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return isset($this->id) ? $this->id : null;
    }

    public function getEmail(): ?string
    {
        return $this->email;
    }

    public function setEmail(string $email): static
    {
        $this->email = $email;

        return $this;
    }

    public function getConsentedAt(): ?\DateTimeImmutable
    {
        return $this->consentedAt;
    }

    public function setConsentedAt(?\DateTimeImmutable $consentedAt): static
    {
        $this->consentedAt = $consentedAt;

        return $this;
    }

    public function getPhoneNumber(): ?string
    {
        return $this->phoneNumber;
    }

    public function setPhoneNumber(?string $phoneNumber): static
    {
        $this->phoneNumber = $phoneNumber;

        return $this;
    }

    public function getAlias(): ?string
    {
        return $this->alias;
    }

    public function setAlias(?string $alias): static
    {
        // Sanitize : supprime les balises potentielles + trim. La validation
        // Assert\Regex s'occupe du reste (caractères autorisés uniquement).
        if (null !== $alias) {
            $clean = trim(strip_tags($alias));
            $this->alias = '' === $clean ? null : $clean;
        } else {
            $this->alias = null;
        }

        return $this;
    }

    public function getAvatarUrl(): ?string
    {
        return $this->avatarUrl;
    }

    public function setAvatarUrl(?string $avatarUrl): static
    {
        $this->avatarUrl = $avatarUrl;

        return $this;
    }

    public function getBio(): ?string
    {
        return $this->bio;
    }

    /**
     * Setter avec sanitization automatique :
     * - `strip_tags` : retire toute balise HTML (XSS).
     * - Normalisation des retours à la ligne (\r\n → \n) + trim.
     * - Chaîne vide → null pour garder une base propre.
     */
    public function setBio(?string $bio): static
    {
        if (null === $bio) {
            $this->bio = null;

            return $this;
        }

        $clean = strip_tags($bio);
        $clean = str_replace(["\r\n", "\r"], "\n", $clean);
        $clean = trim($clean);
        $this->bio = '' === $clean ? null : $clean;

        return $this;
    }

    /**
     * A visual identifier that represents this user.
     *
     * @see UserInterface
     */
    public function getUserIdentifier(): string
    {
        $identifier = $this->email ?? 'unknown-user';

        return '' !== $identifier ? $identifier : 'unknown-user';
    }

    /**
     * @see UserInterface
     */
    public function getRoles(): array
    {
        $roles = $this->roles;
        // guarantee every user at least has ROLE_USER
        $roles[] = 'ROLE_USER';

        return array_unique($roles);
    }

    /**
     * @param list<string> $roles
     */
    public function setRoles(array $roles): static
    {
        $this->roles = $roles;

        return $this;
    }

    /**
     * @see PasswordAuthenticatedUserInterface
     */
    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;

        return $this;
    }

    public function getGoogleId(): ?string
    {
        return $this->googleId;
    }

    public function setGoogleId(?string $googleId): static
    {
        $this->googleId = $googleId;

        return $this;
    }

    public function getAppleId(): ?string
    {
        return $this->appleId;
    }

    public function setAppleId(?string $appleId): static
    {
        $this->appleId = $appleId;

        return $this;
    }

    public function getPasswordResetTokenHash(): ?string
    {
        return $this->passwordResetTokenHash;
    }

    public function setPasswordResetTokenHash(?string $passwordResetTokenHash): static
    {
        $this->passwordResetTokenHash = $passwordResetTokenHash;

        return $this;
    }

    public function getPasswordResetExpiresAt(): ?\DateTimeImmutable
    {
        return $this->passwordResetExpiresAt;
    }

    public function setPasswordResetExpiresAt(?\DateTimeImmutable $passwordResetExpiresAt): static
    {
        $this->passwordResetExpiresAt = $passwordResetExpiresAt;

        return $this;
    }

    public function getPlainPassword(): ?string
    {
        return $this->plainPassword;
    }

    public function setPlainPassword(?string $plainPassword): static
    {
        $this->plainPassword = $plainPassword;

        return $this;
    }

    /**
     * Ensure the session doesn't contain actual password hashes by CRC32C-hashing them, as supported since Symfony 7.3.
     */
    public function __serialize(): array
    {
        $data = (array) $this;
        $data["\0".self::class."\0password"] = hash('crc32c', $this->password);

        return $data;
    }

    #[\Deprecated]
    public function eraseCredentials(): void
    {
        // @deprecated, to be removed when upgrading to Symfony 8
    }

    /**
     * @return Collection<int, Category>
     */
    public function getInterests(): Collection
    {
        return $this->interests;
    }

    public function addInterest(Category $interest): static
    {
        if (!$this->interests->contains($interest)) {
            $this->interests->add($interest);
        }

        return $this;
    }

    public function removeInterest(Category $interest): static
    {
        $this->interests->removeElement($interest);

        return $this;
    }

    /**
     * @return Collection<int, Activity>
     */
    public function getFavorites(): Collection
    {
        return $this->favorites;
    }

    public function addFavorite(Activity $activity): static
    {
        if (!$this->favorites->contains($activity)) {
            $this->favorites->add($activity);
        }

        return $this;
    }

    public function removeFavorite(Activity $activity): static
    {
        $this->favorites->removeElement($activity);

        return $this;
    }

    public function hasFavorite(Activity $activity): bool
    {
        return $this->favorites->contains($activity);
    }

    /**
     * @return Collection<int, AdminWebauthnCredential>
     */
    public function getWebauthnCredentials(): Collection
    {
        return $this->webauthnCredentials;
    }

    public function addWebauthnCredential(AdminWebauthnCredential $credential): static
    {
        if (!$this->webauthnCredentials->contains($credential)) {
            $this->webauthnCredentials->add($credential);
            $credential->setUser($this);
        }

        return $this;
    }

    public function removeWebauthnCredential(AdminWebauthnCredential $credential): static
    {
        if ($this->webauthnCredentials->removeElement($credential)) {
            if ($credential->getUser() === $this) {
                $credential->setUser(null);
            }
        }

        return $this;
    }

    /**
     * Public display name for comments / profile snippets (alias or email local-part).
     *
     * Exposé en lecture seule sur l'API sous le nom `displayName`, afin que le
     * client n'ait plus besoin de calculer le fallback à partir de l'email.
     */
    #[Groups(['user:read'])]
    public function getDisplayName(): string
    {
        if (null !== $this->alias && '' !== trim($this->alias)) {
            return trim($this->alias);
        }
        $email = $this->email ?? '';
        $at = strpos($email, '@');

        return false !== $at ? substr($email, 0, $at) : $email;
    }

    /**
     * @return Collection<int, Comment>
     */
    public function getAuthoredComments(): Collection
    {
        return $this->authoredComments;
    }

    /**
     * @return Collection<int, ActivityRating>
     */
    public function getActivityRatings(): Collection
    {
        return $this->activityRatings;
    }

    public function isHideBadgesOnProfile(): bool
    {
        return $this->hideBadgesOnProfile;
    }

    public function setHideBadgesOnProfile(bool $hideBadgesOnProfile): static
    {
        $this->hideBadgesOnProfile = $hideBadgesOnProfile;

        return $this;
    }

    public function getMapExplorationConsentAt(): ?\DateTimeImmutable
    {
        return $this->mapExplorationConsentAt;
    }

    public function setMapExplorationConsentAt(?\DateTimeImmutable $mapExplorationConsentAt): static
    {
        $this->mapExplorationConsentAt = $mapExplorationConsentAt;

        return $this;
    }

    public function isMapExplorationEnabled(): bool
    {
        return $this->mapExplorationEnabled;
    }

    public function setMapExplorationEnabled(bool $mapExplorationEnabled): static
    {
        $this->mapExplorationEnabled = $mapExplorationEnabled;

        return $this;
    }

    /** Consentement + interrupteur activés (fonctionnalité réellement active). */
    public function isMapExplorationActive(): bool
    {
        return $this->mapExplorationEnabled && null !== $this->mapExplorationConsentAt;
    }

    /**
     * @return Collection<int, UserBadge>
     */
    public function getUserBadges(): Collection
    {
        return $this->userBadges;
    }

    /**
     * @return Collection<int, UserBadgeDisplay>
     */
    public function getBadgeDisplays(): Collection
    {
        return $this->badgeDisplays;
    }
}
