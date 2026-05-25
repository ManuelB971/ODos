<?php

namespace App\Controller\Admin;

use App\Entity\Activity;
use App\Entity\BadgeDefinition;
use App\Entity\AdminAuditLog;
use App\Entity\AdminWebauthnCredential;
use App\Entity\Category;
use App\Entity\Comment;
use App\Entity\RefreshToken;
use App\Entity\User;
use App\Repository\AdminAuditLogRepository;
use App\Service\AdminAuditLogger;
use App\Service\AdminDashboardStatsProvider;
use EasyCorp\Bundle\EasyAdminBundle\Config\Dashboard;
use EasyCorp\Bundle\EasyAdminBundle\Config\MenuItem;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractDashboardController;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class DashboardController extends AbstractDashboardController
{
    public function __construct(
        private readonly AdminDashboardStatsProvider $adminDashboardStatsProvider,
    ) {
    }

    #[Route('/admin', name: 'admin')]
    public function index(): Response
    {
        return $this->render('admin/dashboard.html.twig', $this->adminDashboardStatsProvider->getDashboardData());
    }

    #[Route('/admin/recommendations', name: 'admin_recommendations')]
    public function recommendations(): Response
    {
        return $this->render('admin/recommendations.html.twig', [
            'metrics' => $this->adminDashboardStatsProvider->getRecommendationMetrics(),
        ]);
    }

    #[Route('/admin/logs/export.csv', name: 'admin_logs_export_csv', methods: ['GET'])]
    public function exportAdminLogsCsv(AdminAuditLogRepository $adminAuditLogRepository, AdminAuditLogger $adminAuditLogger): StreamedResponse
    {
        $rows = $adminAuditLogRepository->findBy([], ['createdAt' => 'DESC']);
        $adminAuditLogger->log('EXPORT', 'AdminAuditLog', null, sprintf('Export CSV des logs admin (%d lignes)', count($rows)), 'info');

        $response = new StreamedResponse(function () use ($rows): void {
            $handle = fopen('php://output', 'wb');
            if (false === $handle) {
                return;
            }

            fputcsv($handle, ['id', 'created_at', 'admin_email', 'action', 'entity_class', 'entity_id', 'level', 'summary', 'context_json'], ';');

            foreach ($rows as $log) {
                fputcsv($handle, [
                    $log->getId(),
                    $log->getCreatedAt()->format('Y-m-d H:i:s'),
                    $log->getAdminEmail(),
                    $log->getAction(),
                    $log->getEntityClass(),
                    $log->getEntityId(),
                    $log->getLevel(),
                    $log->getSummary(),
                    json_encode($log->getContext(), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
                ], ';');
            }

            fclose($handle);
        });

        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="admin_audit_logs.csv"');

        return $response;
    }

    public function configureDashboard(): Dashboard
    {
        return Dashboard::new()
            ->setTitle('Odos Back');
    }

    public function configureMenuItems(): iterable
    {
        yield MenuItem::linkToDashboard('Dashboard', 'fa fa-home');
        yield MenuItem::linkToRoute('Recommandations', 'fas fa-brain', 'admin_recommendations');
        yield MenuItem::linkToCrud('Utilisateurs', 'fas fa-users', User::class);
        yield MenuItem::linkToCrud('Catégories', 'fas fa-list', Category::class);
        yield MenuItem::linkToCrud('Activités', 'fas fa-map-marker-alt', Activity::class);
        yield MenuItem::linkToCrud('Badges', 'fas fa-award', BadgeDefinition::class);
        yield MenuItem::linkToRoute('Importer activités', 'fas fa-file-import', 'admin_activities_import');
        yield MenuItem::linkToCrud('Commentaires', 'fas fa-comments', Comment::class);
        yield MenuItem::linkToCrud('Jetons refresh (JWT)', 'fas fa-key', RefreshToken::class);
        yield MenuItem::linkToCrud('WebAuthn (admin)', 'fas fa-fingerprint', AdminWebauthnCredential::class);
        yield MenuItem::linkToCrud('Logs admin', 'fas fa-clipboard-list', AdminAuditLog::class);
        yield MenuItem::linkToRoute('Export CSV logs', 'fas fa-file-csv', 'admin_logs_export_csv');
    }
}
