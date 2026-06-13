<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\Activity;
use App\Entity\ActivityRating;
use App\Entity\AdminAuditLog;
use App\Entity\ActivityGroup;
use App\Entity\Category;
use App\Entity\Comment;
use App\Entity\ForumReply;
use App\Entity\ForumThread;
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

        $ratingsCount = $this->safeCount(ActivityRating::class, 'r');
        $commentsCount = $this->safeCount(Comment::class, 'c');
        $hiddenCommentsCount = $this->safeCount(Comment::class, 'c', 'c.isHidden = true');

        $forumThreadsCount = $this->safeCount(ForumThread::class, 't');
        $forumRepliesCount = $this->safeCount(ForumReply::class, 'r');
        $groupsCount = $this->safeCount(ActivityGroup::class, 'g');

        $topForumThreads = [];
        try {
            $topForumThreads = $conn->fetchAllAssociative(
                'SELECT t.id, t.title, t.reply_count
                 FROM forum_thread t
                 ORDER BY t.reply_count DESC, t.created_at DESC
                 LIMIT 5'
            );
        } catch (\Throwable) {
            $topForumThreads = [];
        }

        $ratingAverageGlobal = null;
        try {
            $ratingAverageGlobal = $this->entityManager->createQueryBuilder()
                ->select('AVG(r.score)')
                ->from(ActivityRating::class, 'r')
                ->getQuery()
                ->getSingleScalarResult();
            $ratingAverageGlobal = null !== $ratingAverageGlobal ? round((float) $ratingAverageGlobal, 2) : null;
        } catch (\Throwable) {
            $ratingAverageGlobal = null;
        }

        return [
            'stats' => [
                'users' => $userCount,
                'activities' => $activityCount,
                'activities_published' => $publishedCount,
                'categories' => $categoryCount,
                'favorite_links' => $favoriteLinksCount,
                'users_with_phone' => $usersWithPhone,
                'admin_events' => $adminEventsCount,
                'ratings' => $ratingsCount,
                'rating_average_global' => $ratingAverageGlobal,
                'comments' => $commentsCount,
                'comments_hidden' => $hiddenCommentsCount,
                'forum_threads' => $forumThreadsCount,
                'forum_replies' => $forumRepliesCount,
                'groups' => $groupsCount,
            ],
            'recent_activities' => $recentActivities,
            'top_favorited' => $topFavorited,
            'top_forum_threads' => $topForumThreads,
            'log_snippet' => $logSnippet,
            'recent_admin_events' => $recentAdminEvents,
        ];
    }

    /**
     * Compte tolérant à l'absence de table (ex. avant migration en environnement local).
     */
    /**
     * @param class-string $entityClass
     */
    private function safeCount(string $entityClass, string $alias, ?string $where = null): int
    {
        try {
            $qb = $this->entityManager->createQueryBuilder()
                ->select(sprintf('COUNT(%s.id)', $alias))
                ->from($entityClass, $alias);

            if (null !== $where) {
                $qb->where($where);
            }

            return (int) $qb->getQuery()->getSingleScalarResult();
        } catch (\Throwable) {
            return 0;
        }
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
        $logsDir = $this->parameterBag->get('kernel.logs_dir');
        if (!is_string($logsDir) || '' === $logsDir) {
            return [];
        }
        $dir = $logsDir;
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
