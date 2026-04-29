<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Service\ActivityImportService;
use App\Service\AdminAuditLogger;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[IsGranted('ROLE_ADMIN')]
final class ActivityImportController extends AbstractController
{
    public function __construct(
        private readonly ActivityImportService $importService,
        private readonly AdminAuditLogger $auditLogger,
    ) {
    }

    #[Route('/admin/activities/import', name: 'admin_activities_import', methods: ['GET', 'POST'])]
    public function import(Request $request): Response
    {
        $result = null;

        if ($request->isMethod('POST')) {
            $submittedToken = (string) $request->request->get('_token');
            if (!$this->isCsrfTokenValid('admin_activities_import', $submittedToken)) {
                $this->addFlash('danger', 'Jeton CSRF invalide. Recharge la page et réessaie.');
                return $this->redirectToRoute('admin_activities_import');
            }

            $file = $request->files->get('file');
            $createMissing = (bool) $request->request->get('create_missing_categories', false);

            if (!$file instanceof UploadedFile) {
                $this->addFlash('danger', 'Aucun fichier fourni.');
                return $this->redirectToRoute('admin_activities_import');
            }

            if (!$file->isValid()) {
                $this->addFlash('danger', sprintf('Téléversement échoué : %s', $file->getErrorMessage()));
                return $this->redirectToRoute('admin_activities_import');
            }

            $maxBytes = 5 * 1024 * 1024; // 5 MiB
            if ($file->getSize() !== false && $file->getSize() > $maxBytes) {
                $this->addFlash('danger', 'Le fichier dépasse la taille maximale (5 Mo).');
                return $this->redirectToRoute('admin_activities_import');
            }

            $allowedExtensions = ['xlsx', 'xls', 'ods', 'csv'];
            $ext = strtolower($file->getClientOriginalExtension() ?: '');
            if (!in_array($ext, $allowedExtensions, true)) {
                $this->addFlash('danger', sprintf('Extension non autorisée (%s). Formats acceptés : %s.', $ext ?: 'inconnue', implode(', ', $allowedExtensions)));
                return $this->redirectToRoute('admin_activities_import');
            }

            $result = $this->importService->import($file, $createMissing);

            $this->auditLogger->log(
                'IMPORT',
                'Activity',
                null,
                sprintf(
                    'Import activités via fichier "%s" : %d créées, %d ignorées, %d erreur(s)%s',
                    $file->getClientOriginalName(),
                    $result->createdCount,
                    $result->skippedCount,
                    count($result->errors),
                    null !== $result->fatalError ? sprintf(' [FATAL : %s]', $result->fatalError) : '',
                ),
                null !== $result->fatalError ? 'error' : 'info',
                [
                    'created' => $result->createdCount,
                    'skipped' => $result->skippedCount,
                    'errors_count' => count($result->errors),
                    'create_missing_categories' => $createMissing,
                    'filename' => $file->getClientOriginalName(),
                ],
            );

            if (null !== $result->fatalError) {
                $this->addFlash('danger', $result->fatalError);
            } else {
                $this->addFlash(
                    'success',
                    sprintf('%d activité(s) importée(s).', $result->createdCount)
                );
                if ($result->skippedCount > 0) {
                    $this->addFlash('warning', sprintf('%d ligne(s) ignorée(s) (voir détails ci-dessous).', $result->skippedCount));
                }
            }
        }

        return $this->render('admin/activity_import.html.twig', [
            'result' => $result,
        ]);
    }

    #[Route('/admin/activities/import/template.csv', name: 'admin_activities_import_template', methods: ['GET'])]
    public function downloadTemplate(): StreamedResponse
    {
        $rows = [
            ['name', 'description', 'latitude', 'longitude', 'category', 'city', 'price', 'image_url', 'date_start', 'date_end', 'is_published'],
            ['Visite du Vieux-Lyon', 'Balade guidée dans le quartier Renaissance', '45.7621', '4.8278', 'Culture', 'Lyon', '0', '', '2026-05-01 10:00', '2026-05-01 12:00', '1'],
            ['Atelier poterie', 'Initiation au tournage', '48.8566', '2.3522', 'Loisirs', 'Paris', '25', '', '', '', '1'],
        ];

        $response = new StreamedResponse(function () use ($rows): void {
            $handle = fopen('php://output', 'wb');
            if (false === $handle) {
                return;
            }
            // BOM UTF-8 pour Excel
            fwrite($handle, "\xEF\xBB\xBF");
            foreach ($rows as $row) {
                fputcsv($handle, $row, ';');
            }
            fclose($handle);
        });

        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="activities_template.csv"');

        return $response;
    }
}
