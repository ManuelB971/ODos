<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Activity;
use App\Entity\Parcours;
use App\Entity\ParcoursItem;
use App\Entity\User;
use App\Enum\ParcoursVisibility;
use App\Repository\ActivityRepository;
use App\Repository\ParcoursCollaboratorRepository;
use App\Repository\ParcoursItemRepository;
use App\Repository\ParcoursRepository;
use App\Repository\UserRepository;
use App\Service\ParcoursCoverUploader;
use App\Service\ParcoursService;
use App\Service\SocialSerializer;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\File\Exception\FileException;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/parcours')]
final class ParcoursController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly ParcoursRepository $parcoursRepository,
        private readonly ParcoursItemRepository $itemRepository,
        private readonly ParcoursCollaboratorRepository $collaboratorRepository,
        private readonly ActivityRepository $activityRepository,
        private readonly UserRepository $userRepository,
        private readonly ParcoursService $parcoursService,
        private readonly SocialSerializer $serializer,
        private readonly ParcoursCoverUploader $coverUploader,
        private readonly EntityManagerInterface $em,
        private readonly LoggerInterface $logger,
        private readonly string $uploadDir,
        private readonly string $publicPrefix,
    ) {
    }

    #[Route('', name: 'api_parcours_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        $user = $this->requireUser();
        $items = $this->parcoursRepository->findForUser($user);

        $member = array_map(function (Parcours $p) use ($user): array {
            $ordered = $this->itemRepository->findOrdered($p);
            $cover = null;
            foreach ($ordered as $it) {
                $cover = $it->getActivity()?->getImageUrl();
                if (null !== $cover) {
                    break;
                }
            }
            $collaboratorCount = \count($this->collaboratorRepository->findForParcours($p));

            return $this->serializer->parcoursToArray($p, $user, $cover, $collaboratorCount);
        }, $items);

        return $this->json(['member' => $member]);
    }

    #[Route('', name: 'api_parcours_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $payload = $request->toArray();

        try {
            $parcours = $this->parcoursService->create(
                $user,
                (string) ($payload['title'] ?? ''),
                isset($payload['description']) ? (string) $payload['description'] : null,
            );

            // Étapes initiales optionnelles.
            foreach ((array) ($payload['activityIds'] ?? []) as $activityId) {
                $activity = $this->activityRepository->find((int) $activityId);
                if ($activity instanceof Activity) {
                    $this->parcoursService->addItem($parcours, $activity);
                }
            }
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json(['parcours' => $this->detail($parcours, $user)], Response::HTTP_CREATED);
    }

    #[Route('/{id}', name: 'api_parcours_get', methods: ['GET'], requirements: ['id' => '\d+'])]
    public function get(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $parcours = $this->parcoursRepository->find($id);
        // Lecture : un parcours public est consultable par tout utilisateur connecté.
        if (!$parcours instanceof Parcours || !$this->parcoursService->canView($parcours, $user)) {
            return $this->notFound();
        }

        return $this->json(['parcours' => $this->detail($parcours, $user)]);
    }

    #[Route('/{id}', name: 'api_parcours_update', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    public function update(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $parcours = $this->loadAccessible($id, $user);
        if (!$parcours instanceof Parcours) {
            return $this->notFound();
        }

        $payload = $request->toArray();
        // La visibilité est un réglage propriétaire (un collaborateur ne la change pas).
        $visibility = null;
        if (isset($payload['visibility']) && $this->parcoursService->isOwner($parcours, $user)) {
            $visibility = ParcoursVisibility::tryFrom((string) $payload['visibility']);
        }

        try {
            $this->parcoursService->rename(
                $parcours,
                isset($payload['title']) ? (string) $payload['title'] : null,
                isset($payload['description']) ? (string) $payload['description'] : null,
                $visibility,
            );
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json(['parcours' => $this->detail($parcours, $user)]);
    }

    #[Route('/{id}/items', name: 'api_parcours_item_add', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function addItem(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $parcours = $this->loadAccessible($id, $user);
        if (!$parcours instanceof Parcours) {
            return $this->notFound();
        }

        $payload = $request->toArray();
        $activity = $this->activityRepository->find((int) ($payload['activityId'] ?? 0));
        if (!$activity instanceof Activity) {
            return $this->json(['message' => 'Activité introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->parcoursService->addItem($parcours, $activity, isset($payload['note']) ? (string) $payload['note'] : null);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json(['parcours' => $this->detail($parcours, $user)], Response::HTTP_CREATED);
    }

    #[Route('/{id}/items/reorder', name: 'api_parcours_item_reorder', methods: ['PATCH'], requirements: ['id' => '\d+'])]
    public function reorder(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $parcours = $this->loadAccessible($id, $user);
        if (!$parcours instanceof Parcours) {
            return $this->notFound();
        }

        $order = array_map('intval', (array) ($request->toArray()['order'] ?? []));
        $this->parcoursService->reorder($parcours, $order);

        return $this->json(['parcours' => $this->detail($parcours, $user)]);
    }

    #[Route('/{id}/items/{itemId}', name: 'api_parcours_item_delete', methods: ['DELETE'], requirements: ['id' => '\d+', 'itemId' => '\d+'])]
    public function removeItem(int $id, int $itemId): JsonResponse
    {
        $user = $this->requireUser();
        $parcours = $this->loadAccessible($id, $user);
        if (!$parcours instanceof Parcours) {
            return $this->notFound();
        }

        $item = $this->itemRepository->find($itemId);
        if (!$item instanceof ParcoursItem) {
            return $this->json(['message' => 'Étape introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->parcoursService->removeItem($parcours, $item);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json(['parcours' => $this->detail($parcours, $user)]);
    }

    #[Route('/{id}/cover', name: 'api_parcours_cover_upload', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function uploadCover(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $parcours = $this->parcoursRepository->find($id);
        if (!$parcours instanceof Parcours || !$this->parcoursService->isOwner($parcours, $user)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        /** @var UploadedFile|null $file */
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile) {
            return $this->json(['message' => 'Aucun fichier envoyé (champ "file" requis).'], Response::HTTP_BAD_REQUEST);
        }

        try {
            $newUrl = $this->coverUploader->upload($file, (int) $parcours->getId());
        } catch (FileException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        } catch (\Throwable $e) {
            $this->logger->error('ParcoursController.uploadCover', ['id' => $id, 'error' => $e->getMessage()]);

            return $this->json(['message' => 'Upload impossible.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        $this->cleanupCover($parcours->getCoverImageUrl());
        $parcours->setCoverImageUrl($newUrl);
        $parcours->touch();
        $this->em->flush();

        return $this->json(['parcours' => $this->detail($parcours, $user)]);
    }

    #[Route('/{id}/cover', name: 'api_parcours_cover_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function deleteCover(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $parcours = $this->parcoursRepository->find($id);
        if (!$parcours instanceof Parcours || !$this->parcoursService->isOwner($parcours, $user)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $this->cleanupCover($parcours->getCoverImageUrl());
        $parcours->setCoverImageUrl(null);
        $parcours->touch();
        $this->em->flush();

        return $this->json(['parcours' => $this->detail($parcours, $user)]);
    }

    #[Route('/{id}/collaborators', name: 'api_parcours_collaborator_add', methods: ['POST'], requirements: ['id' => '\d+'])]
    public function addCollaborator(int $id, Request $request): JsonResponse
    {
        $user = $this->requireUser();
        $parcours = $this->parcoursRepository->find($id);
        // Seul le propriétaire invite des co-éditeurs.
        if (!$parcours instanceof Parcours || !$this->parcoursService->isOwner($parcours, $user)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $target = $this->userRepository->find((int) ($request->toArray()['userId'] ?? 0));
        if (!$target instanceof User) {
            return $this->json(['message' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        try {
            $this->parcoursService->addCollaborator($parcours, $target);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        }

        return $this->json(['parcours' => $this->detail($parcours, $user)], Response::HTTP_CREATED);
    }

    #[Route('/{id}/collaborators/{userId}', name: 'api_parcours_collaborator_delete', methods: ['DELETE'], requirements: ['id' => '\d+', 'userId' => '\d+'])]
    public function removeCollaborator(int $id, int $userId): JsonResponse
    {
        $user = $this->requireUser();
        $parcours = $this->parcoursRepository->find($id);
        if (!$parcours instanceof Parcours || !$this->parcoursService->isOwner($parcours, $user)) {
            return $this->json(['message' => 'Accès refusé.'], Response::HTTP_FORBIDDEN);
        }

        $target = $this->userRepository->find($userId);
        if (!$target instanceof User) {
            return $this->json(['message' => 'Utilisateur introuvable.'], Response::HTTP_NOT_FOUND);
        }

        $this->parcoursService->removeCollaborator($parcours, $target);

        return $this->json(['parcours' => $this->detail($parcours, $user)]);
    }

    #[Route('/{id}', name: 'api_parcours_delete', methods: ['DELETE'], requirements: ['id' => '\d+'])]
    public function delete(int $id): JsonResponse
    {
        $user = $this->requireUser();
        $parcours = $this->loadAccessible($id, $user);
        if (!$parcours instanceof Parcours) {
            return $this->notFound();
        }

        try {
            $this->parcoursService->delete($parcours, $user);
        } catch (\InvalidArgumentException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_FORBIDDEN);
        }

        return $this->json(['message' => 'Parcours supprimé.']);
    }

    /**
     * @return array<string, mixed>
     */
    private function detail(Parcours $parcours, User $user): array
    {
        return $this->serializer->parcoursDetailToArray(
            $parcours,
            $this->itemRepository->findOrdered($parcours),
            $this->collaboratorRepository->findForParcours($parcours),
            $user,
        );
    }

    /**
     * Supprime best-effort l'ancienne pochette si elle est dans notre dossier
     * d'uploads (prévention suppression arbitraire sur disque).
     */
    private function cleanupCover(?string $previous): void
    {
        if (!is_string($previous) || !str_starts_with($previous, $this->publicPrefix.'/')) {
            return;
        }
        $relative = substr($previous, strlen($this->publicPrefix.'/'));
        if ('' !== $relative && !str_contains($relative, '..') && !str_contains($relative, '/')) {
            $path = rtrim($this->uploadDir, '/').'/'.$relative;
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }

    private function loadAccessible(int $id, User $user): ?Parcours
    {
        $parcours = $this->parcoursRepository->find($id);
        if (!$parcours instanceof Parcours || !$this->parcoursService->canAccess($parcours, $user)) {
            return null;
        }

        return $parcours;
    }

    private function notFound(): JsonResponse
    {
        return $this->json(['message' => 'Parcours introuvable.'], Response::HTTP_NOT_FOUND);
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
