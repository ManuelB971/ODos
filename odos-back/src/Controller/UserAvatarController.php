<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Service\ThrottledActionException;
use App\Service\UserActionThrottleService;
use App\Service\UserAvatarUploader;
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

/**
 * Endpoint d'upload de l'avatar de l'utilisateur courant.
 *
 * POST `/api/me/avatar` (multipart/form-data)
 *   - champ `file` : image (jpg/png/webp, 2 MiB max)
 *   - auth : ROLE_USER
 *   - throttle : 1 upload / 10 s / user
 *
 * Sécurité :
 *  - Pas de paramètre `userId` exposé → on agit TOUJOURS sur l'utilisateur
 *    authentifié (pas d'IDOR possible même si le token était volé).
 *  - Le nom de fichier final est généré côté serveur (aucun bout de chaîne
 *    client dans le chemin).
 *  - `UserAvatarUploader` applique la whitelist MIME + taille.
 *  - Suppression best-effort de l'ancien avatar (stocké sous notre upload dir
 *    uniquement — on vérifie le préfixe pour éviter qu'une valeur malveillante
 *    persistée ne force la suppression d'un fichier système).
 */
final class UserAvatarController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly EntityManagerInterface $em,
        private readonly UserAvatarUploader $uploader,
        private readonly UserActionThrottleService $throttle,
        private readonly LoggerInterface $logger,
        private readonly string $uploadDir,
        private readonly string $publicPrefix,
    ) {
    }

    #[Route('/api/me/avatar', name: 'api_me_avatar_upload', methods: ['POST'])]
    public function upload(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        $userId = (int) $user->getId();

        try {
            $this->throttle->assertCanUploadAvatar($userId);
        } catch (ThrottledActionException $e) {
            return $this->json(
                [
                    'message' => $e->getMessage(),
                    'retryAfterSeconds' => $e->getRetryAfterSeconds(),
                    'code' => 'RATE_LIMITED',
                ],
                Response::HTTP_TOO_MANY_REQUESTS,
                ['Retry-After' => (string) $e->getRetryAfterSeconds()]
            );
        }

        /** @var UploadedFile|null $file */
        $file = $request->files->get('file');
        if (!$file instanceof UploadedFile) {
            return $this->json(
                ['message' => 'Aucun fichier envoyé (champ "file" requis).'],
                Response::HTTP_BAD_REQUEST
            );
        }

        try {
            $newUrl = $this->uploader->upload($file, $userId);
        } catch (FileException $e) {
            return $this->json(['message' => $e->getMessage()], Response::HTTP_BAD_REQUEST);
        } catch (\Throwable $e) {
            $this->logger->error('UserAvatarController.upload', [
                'userId' => $userId,
                'error' => $e->getMessage(),
            ]);
            return $this->json(['message' => 'Upload impossible.'], Response::HTTP_INTERNAL_SERVER_ERROR);
        }

        // Best-effort cleanup de l'ancien avatar, uniquement s'il est dans notre
        // dossier d'uploads (prévention suppression arbitraire sur disque).
        $previous = $user->getAvatarUrl();
        if (is_string($previous) && str_starts_with($previous, $this->publicPrefix . '/')) {
            $relative = substr($previous, strlen($this->publicPrefix . '/'));
            // Pas de `..`, pas de slash → on reste strictement dans le dossier.
            if ('' !== $relative && !str_contains($relative, '..') && !str_contains($relative, '/')) {
                $path = rtrim($this->uploadDir, '/').'/'.$relative;
                if (is_file($path)) {
                    @unlink($path);
                }
            }
        }

        $user->setAvatarUrl($newUrl);
        $this->em->flush();
        $this->throttle->markAvatarUploaded($userId);

        return $this->json([
            'avatarUrl' => $newUrl,
            'message' => 'Avatar mis à jour.',
        ]);
    }

    /**
     * DELETE /api/me/avatar — retire l'avatar courant (utile pour revenir à l'avatar par défaut).
     */
    #[Route('/api/me/avatar', name: 'api_me_avatar_delete', methods: ['DELETE'])]
    public function delete(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        $previous = $user->getAvatarUrl();
        if (is_string($previous) && str_starts_with($previous, $this->publicPrefix . '/')) {
            $relative = substr($previous, strlen($this->publicPrefix . '/'));
            if ('' !== $relative && !str_contains($relative, '..') && !str_contains($relative, '/')) {
                $path = rtrim($this->uploadDir, '/').'/'.$relative;
                if (is_file($path)) {
                    @unlink($path);
                }
            }
        }

        $user->setAvatarUrl(null);
        $this->em->flush();

        return $this->json(['message' => 'Avatar retiré.']);
    }
}
