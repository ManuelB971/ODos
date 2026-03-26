<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Activity;
use App\Entity\AdminAuditLog;
use App\Entity\Category;
use App\Entity\User;
use App\Repository\AdminAuditLogRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;

final class AdminDashboardStatsProvider
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly ParameterBagInterface $parameterBag,
        private readonly AdminAuditLogRepository $adminAuditLogRepository,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function getDashboardData(): array
    {
        $conn = $this->entityManager->getConnection();

        $userCount = (int) $this->entityManager->createQueryBuilder()
            ->select('COUNT(u.id)')
            ->from(User::class, 'u')
            ->getQuery()
            ->getSingleScalarResult();

        $activityCount = (int) $this->entityManager->createQueryBuilder()
            ->select('COUNT(a.id)')
            ->from(Activity::class, 'a')
            ->getQuery()
            ->getSingleScalarResult();

        $publishedCount = (int) $this->entityManager->createQueryBuilder()
            ->select('COUNT(a.id)')
            ->from(Activity::class, 'a')
            ->where('a.isPublished = true')
            ->getQuery()
            ->getSingleScalarResult();

        $categoryCount = (int) $this->entityManager->createQueryBuilder()
            ->select('COUNT(c.id)')
            ->from(Category::class, 'c')
            ->getQuery()
            ->getSingleScalarResult();

        $usersWithPhone = (int) $this->entityManager->createQueryBuilder()
            ->select('COUNT(u.id)')
            ->from(User::class, 'u')
            ->where('u.phoneNumber IS NOT NULL AND u.phoneNumber <> \'\'')
            ->getQuery()
            ->getSingleScalarResult();

        $favoriteLinksCount = 0;
        try {
            $favoriteLinksCount = (int) $conn->fetchOne('SELECT COUNT(*) FROM user_favorite_activity');
        } catch (\Throwable) {
            // table missing in early dev
        }

        $recentActivities = $this->entityManager->getRepository(Activity::class)
            ->createQueryBuilder('a')
            ->orderBy('a.id', 'DESC')
            ->setMaxResults(8)
            ->getQuery()
            ->getResult();

        $topFavorited = [];
        try {
            $topFavorited = $conn->fetchAllAssociative(
                'SELECT a.id, a.name, COUNT(f.user_id) AS favorites_count
                 FROM activity a
                 LEFT JOIN user_favorite_activity f ON f.activity_id = a.id
                 GROUP BY a.id, a.name
                 ORDER BY favorites_count DESC
                 LIMIT 5'
            );
        } catch (\Throwable) {
            $topFavorited = [];
        }

        $logSnippet = $this->getLastLogLines(18);
        $recentAdminEvents = $this->adminAuditLogRepository->findLatest(8);
        $adminEventsCount = (int) $this->entityManager->createQueryBuilder()
            ->select('COUNT(l.id)')
            ->from(AdminAuditLog::class, 'l')
            ->getQuery()
            ->getSingleScalarResult();

        return [
            'stats' => [
                'users' => $userCount,
                'activities' => $activityCount,
                'activities_published' => $publishedCount,
                'categories' => $categoryCount,
                'favorite_links' => $favoriteLinksCount,
                'users_with_phone' => $usersWithPhone,
                'admin_events' => $adminEventsCount,
            ],
            'recent_activities' => $recentActivities,
            'top_favorited' => $topFavorited,
            'log_snippet' => $logSnippet,
            'recent_admin_events' => $recentAdminEvents,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function getRecommendationMetrics(): array
    {
        $totalUsers = (int) $this->entityManager->createQueryBuilder()
            ->select('COUNT(u.id)')
            ->from(User::class, 'u')
            ->getQuery()
            ->getSingleScalarResult();

        $usersWithInterests = (int) $this->entityManager->createQueryBuilder()
            ->select('COUNT(DISTINCT u.id)')
            ->from(User::class, 'u')
            ->innerJoin('u.interests', 'i')
            ->getQuery()
            ->getSingleScalarResult();

        $usersWithoutInterests = max(0, $totalUsers - $usersWithInterests);

        $publishedActivities = (int) $this->entityManager->createQueryBuilder()
            ->select('COUNT(a.id)')
            ->from(Activity::class, 'a')
            ->where('a.isPublished = true')
            ->getQuery()
            ->getSingleScalarResult();

        $categories = (int) $this->entityManager->createQueryBuilder()
            ->select('COUNT(c.id)')
            ->from(Category::class, 'c')
            ->getQuery()
            ->getSingleScalarResult();

        return [
            'total_users' => $totalUsers,
            'users_with_interests' => $usersWithInterests,
            'users_without_interests' => $usersWithoutInterests,
            'published_activities' => $publishedActivities,
            'categories' => $categories,
        ];
    }

    /**
     * @return list<string>
     */
    private function getLastLogLines(int $maxLines): array
    {
        $dir = (string) $this->parameterBag->get('kernel.logs_dir');
        $path = $dir.'/dev.log';
        if (!is_readable($path)) {
            return [];
        }

        try {
            $content = file_get_contents($path);
            if (false === $content) {
                return [];
            }
            $lines = preg_split('/\R/', $content) ?: [];
            $lines = array_values(array_filter($lines, static fn (string $l): bool => $l !== ''));

            return array_slice($lines, -$maxLines);
        } catch (\Throwable) {
            return [];
        }
    }
}
