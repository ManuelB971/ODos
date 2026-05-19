<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Activity;
use App\Entity\Category;
use App\Entity\Comment;
use App\Entity\User;
use App\Repository\CommentRepository;

/**
 * Export des données personnelles (art. 20 RGPD) au format JSON structuré.
 */
final class UserDataExportService
{
    public function __construct(
        private readonly CommentRepository $commentRepository,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function export(User $user): array
    {
        $comments = $this->commentRepository->findBy(['author' => $user], ['createdAt' => 'DESC']);
        $ratings = $user->getActivityRatings()->toArray();

        return [
            'exportedAt' => (new \DateTimeImmutable())->format(\DateTimeInterface::ATOM),
            'format' => 'odos-gdpr-export-v1',
            'profile' => [
                'id' => $user->getId(),
                'email' => $user->getEmail(),
                'alias' => $user->getAlias(),
                'bio' => $user->getBio(),
                'avatarUrl' => $user->getAvatarUrl(),
                'displayName' => $user->getDisplayName(),
                'consentedAt' => $user->getConsentedAt()?->format(\DateTimeInterface::ATOM),
                'interests' => array_map(
                    static fn (Category $c) => [
                        'id' => $c->getId(),
                        'name' => $c->getName(),
                    ],
                    $user->getInterests()->toArray()
                ),
            ],
            'favorites' => array_map(
                static fn (Activity $a) => [
                    'id' => $a->getId(),
                    'name' => $a->getName(),
                    'city' => $a->getCity(),
                ],
                $user->getFavorites()->toArray()
            ),
            'comments' => array_map(
                static fn (Comment $c) => [
                    'id' => $c->getId(),
                    'activityId' => $c->getActivity()?->getId(),
                    'content' => $c->getContent(),
                    'createdAt' => $c->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                    'updatedAt' => $c->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
                    'isHidden' => $c->isHidden(),
                ],
                $comments
            ),
            'ratings' => array_map(
                static function ($rating) {
                    return [
                        'activityId' => $rating->getActivity()?->getId(),
                        'activityName' => $rating->getActivity()?->getName(),
                        'score' => $rating->getScore(),
                        'createdAt' => $rating->getCreatedAt()?->format(\DateTimeInterface::ATOM),
                        'updatedAt' => $rating->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
                    ];
                },
                $ratings
            ),
        ];
    }
}
