<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\User;
use App\Service\UserDataExportService;
use App\Service\UserDeletionService;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Droits RGPD sur le compte courant : export (art. 20) et effacement (art. 17).
 */
final class MeAccountController extends AbstractController
{
    public function __construct(
        private readonly Security $security,
        private readonly UserDataExportService $exportService,
        private readonly UserDeletionService $deletionService,
    ) {
    }

    #[Route('/api/me/export', name: 'api_me_export', methods: ['GET'])]
    public function export(): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        return $this->json($this->exportService->export($user));
    }

    #[Route('/api/me', name: 'api_me_delete', methods: ['DELETE'])]
    public function deleteAccount(Request $request): JsonResponse
    {
        $this->denyAccessUnlessGranted('ROLE_USER');
        $user = $this->security->getUser();
        if (!$user instanceof User) {
            return $this->json(['message' => 'Non authentifié.'], Response::HTTP_UNAUTHORIZED);
        }

        $body = $request->toArray();
        if (!filter_var($body['confirm'] ?? false, FILTER_VALIDATE_BOOL)) {
            return $this->json(
                ['message' => 'Confirmation requise : envoyez {"confirm": true}.'],
                Response::HTTP_BAD_REQUEST
            );
        }

        $this->deletionService->deleteUserAccount($user);

        return $this->json(['message' => 'Compte supprimé.'], Response::HTTP_OK);
    }
}
