<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Comment;
use App\Entity\User;
use Symfony\Bundle\SecurityBundle\Security;

/**
 * JSON shape partagé pour les réponses commentaires (liste, création, édition).
 */
final class CommentSerializer
{
    public function __construct(
        private Security $security,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(Comment $comment): array
    {
        $author = $comment->getAuthor();

        $payload = [
            'id' => $comment->getId(),
            'content' => $comment->getContent(),
            'createdAt' => $comment->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'updatedAt' => $comment->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
            'isEdited' => $comment->isEdited(),
            'author' => $author instanceof User
                ? [
                    'id' => $author->getId(),
                    'displayName' => $author->getDisplayName(),
                    'avatarUrl' => $author->getAvatarUrl(),
                ]
                : null,
            'activityId' => $comment->getActivity()?->getId(),
        ];

        if ($this->security->isGranted('ROLE_ADMIN')) {
            $payload['isHidden'] = $comment->isHidden();
        }

        return $payload;
    }
}
