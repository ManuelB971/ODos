<?php

namespace App\Controller;

use App\Entity\Comment;
use App\Entity\User;
use App\Repository\CommentRepository;
use App\Service\CommentContentSanitizer;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

#[Route('/api/comments')]
class CommentItemController extends AbstractController
{
    public function __construct(
        private CommentRepository $commentRepository,
        private EntityManagerInterface $em,
        private Security $security,
        private CommentContentSanitizer $sanitizer,
        private ValidatorInterface $validator,
        private LoggerInterface $logger,
    ) {}

    #[Route('/{id}', name: 'api_comment_patch', methods: ['PATCH'])]
    public function patch(int $id, Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        $comment = $this->commentRepository->find($id);
        if (!$comment instanceof Comment) {
            return $this->json(['message' => 'Commentaire introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if (!$this->canEdit($comment, $user)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $data = json_decode($request->getContent(), true);
        $content = isset($data['content']) ? $this->sanitizer->sanitize((string) $data['content']) : '';

        $violations = $this->validator->validate($content, [
            new Assert\NotBlank(),
            new Assert\Length(min: 2, max: 1000),
        ]);
        if (\count($violations) > 0) {
            return $this->json(['message' => $violations[0]->getMessage()], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $comment->setContent($content);
        $comment->setIsEdited(true);
        $comment->setUpdatedAt(new \DateTimeImmutable());

        $this->em->flush();

        $this->logger->info('comment.updated', ['commentId' => $comment->getId(), 'userId' => $user->getId()]);

        return $this->json($this->serializeComment($comment));
    }

    #[Route('/{id}', name: 'api_comment_delete', methods: ['DELETE'])]
    public function delete(int $id): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        $comment = $this->commentRepository->find($id);
        if (!$comment instanceof Comment) {
            return $this->json(['message' => 'Commentaire introuvable.'], Response::HTTP_NOT_FOUND);
        }

        if (!$this->canEdit($comment, $user)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $comment->setIsHidden(true);
        $comment->setUpdatedAt(new \DateTimeImmutable());
        $this->em->flush();

        $this->logger->warning('comment.hidden_soft_delete', ['commentId' => $comment->getId(), 'userId' => $user->getId()]);

        return $this->json(['message' => 'Commentaire supprimé.', 'id' => $comment->getId()]);
    }

    private function canEdit(Comment $comment, User $user): bool
    {
        if ($this->security->isGranted('ROLE_ADMIN')) {
            return true;
        }

        return $comment->getAuthor()?->getId() === $user->getId();
    }

    /**
     * @return array<string, mixed>
     */
    private function serializeComment(Comment $c): array
    {
        $author = $c->getAuthor();
        \assert($author instanceof User);

        $payload = [
            'id' => $c->getId(),
            'content' => $c->getContent(),
            'createdAt' => $c->getCreatedAt()?->format(\DateTimeInterface::ATOM),
            'updatedAt' => $c->getUpdatedAt()?->format(\DateTimeInterface::ATOM),
            'isEdited' => $c->isEdited(),
            'author' => [
                'id' => $author->getId(),
                'displayName' => $author->getDisplayName(),
            ],
            'activityId' => $c->getActivity()?->getId(),
        ];

        if ($this->security->isGranted('ROLE_ADMIN')) {
            $payload['isHidden'] = $c->isHidden();
        }

        return $payload;
    }
}
