<?php

namespace App\Repository;

use App\Entity\Activity;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Activity>
 */
class ActivityRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Activity::class);
    }

    /**
     * Coordonnées des activités publiées et géolocalisées (grille d'exploration).
     *
     * @return list<array{latitude: float|string, longitude: float|string}>
     */
    public function findPublishedGeoCoordinates(): array
    {
        /** @var list<array<string, mixed>> $rows */
        $rows = $this->createQueryBuilder('a')
            ->select('a.latitude', 'a.longitude')
            ->andWhere('a.isPublished = :published')
            ->andWhere('a.latitude IS NOT NULL')
            ->andWhere('a.longitude IS NOT NULL')
            ->setParameter('published', true)
            ->getQuery()
            ->getArrayResult();

        $coords = [];
        foreach ($rows as $row) {
            $latitude = $row['latitude'] ?? null;
            $longitude = $row['longitude'] ?? null;
            if (!is_numeric($latitude) || !is_numeric($longitude)) {
                continue;
            }
            $coords[] = [
                'latitude' => $latitude,
                'longitude' => $longitude,
            ];
        }

        return $coords;
    }

    /**
     * Villes distinctes des activités publiées (catalogue dynamique pour onboarding / filtre).
     *
     * @return list<array{name: string, activityCount: int, latitude: float, longitude: float}>
     */
    public function findDistinctPublishedCities(): array
    {
        /** @var list<array<string, mixed>> $rows */
        $rows = $this->createQueryBuilder('a')
            ->select('a.city AS name')
            ->addSelect('COUNT(a.id) AS activityCount')
            ->addSelect('AVG(a.latitude) AS latitude')
            ->addSelect('AVG(a.longitude) AS longitude')
            ->andWhere('a.isPublished = :published')
            ->andWhere('a.city IS NOT NULL')
            ->andWhere("TRIM(a.city) != ''")
            ->setParameter('published', true)
            ->groupBy('a.city')
            ->orderBy('a.city', 'ASC')
            ->getQuery()
            ->getArrayResult();

        $cities = [];
        foreach ($rows as $row) {
            $name = isset($row['name']) ? trim((string) $row['name']) : '';
            if ('' === $name) {
                continue;
            }
            $lat = $row['latitude'] ?? null;
            $lng = $row['longitude'] ?? null;
            if (!is_numeric($lat) || !is_numeric($lng)) {
                continue;
            }
            $cities[] = [
                'name' => $name,
                'activityCount' => (int) ($row['activityCount'] ?? 0),
                'latitude' => (float) $lat,
                'longitude' => (float) $lng,
            ];
        }

        return $cities;
    }

    public function isPublishedCityName(string $city): bool
    {
        $trimmed = trim($city);
        if ('' === $trimmed) {
            return false;
        }

        $count = (int) $this->createQueryBuilder('a')
            ->select('COUNT(a.id)')
            ->andWhere('a.isPublished = :published')
            ->andWhere('a.city = :city')
            ->setParameter('published', true)
            ->setParameter('city', $trimmed)
            ->getQuery()
            ->getSingleScalarResult();

        return $count > 0;
    }

    /**
     * Candidats à la recommandation : activités publiées, filtrées par catégories
     * d'intérêt (si fournies), en excluant les lieux déjà connus de l'utilisateur.
     *
     * @param array<int>    $categoryIds catégories d'intérêt (vide = pas de filtre catégorie)
     * @param array<int>    $excludeIds  activités à exclure (favoris + visites)
     * @param string|null   $city        ville cible (exact match sur activity.city)
     *
     * @return array<Activity>
     */
    public function findRecommendationCandidates(array $categoryIds, array $excludeIds, ?string $city = null): array
    {
        $qb = $this->createQueryBuilder('a')
            ->where('a.isPublished = :pub')
            ->setParameter('pub', true)
            ->orderBy('a.id', 'DESC');

        if (null !== $city && '' !== trim($city)) {
            $qb->andWhere('a.city = :city')
                ->setParameter('city', trim($city));
        }

        if ([] !== $categoryIds) {
            $qb->join('a.category', 'c')
                ->andWhere('c.id IN (:categoryIds)')
                ->setParameter('categoryIds', $categoryIds);
        }

        if ([] !== $excludeIds) {
            $qb->andWhere('a.id NOT IN (:excluded)')
                ->setParameter('excluded', $excludeIds);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * Collaborative filtering item-based croisant favoris ET visites :
     * « les utilisateurs au goût proche du vôtre ont aussi aimé / visité… ».
     *
     * 1. On trouve les « voisins » = autres utilisateurs ayant favorisé OU visité
     *    au moins un des lieux de référence de l'utilisateur courant (favoris ∪ visites).
     * 2. On score chaque activité publiée (hors lieux déjà connus) par l'engagement
     *    de ces voisins : visites pondérées + favoris pondérés.
     *
     * Les poids sont injectés par l'appelant (config `app.reco.*`) afin de garder
     * la *politique* de scoring hors de la couche d'accès aux données.
     *
     * @param int        $userId          utilisateur courant (exclu des voisins)
     * @param array<int> $seedActivityIds lieux de référence du goût utilisateur (favoris ∪ visites)
     * @param array<int> $excludeIds      lieux à ne pas recommander (déjà connus)
     * @param float      $visitWeight     poids d'une visite d'un voisin
     * @param float      $favoriteWeight  poids d'un favori d'un voisin
     * @param int        $limit           nombre max d'IDs renvoyés
     *
     * @return array<int> IDs d'activités, les plus pertinentes en premier
     */
    public function findCoEngagedActivityIds(
        int $userId,
        array $seedActivityIds,
        array $excludeIds,
        float $visitWeight = 2.0,
        float $favoriteWeight = 1.0,
        int $limit = 50,
    ): array {
        if ([] === $seedActivityIds) {
            return [];
        }

        $neighborIds = $this->findNeighborUserIds($userId, $seedActivityIds);
        if ([] === $neighborIds) {
            return [];
        }

        /** @var array<int, float> $scores activityId => score pondéré */
        $scores = [];
        $this->accumulateRelationScores($scores, 'visitedBy', $neighborIds, $excludeIds, $visitWeight);
        $this->accumulateRelationScores($scores, 'favoritedBy', $neighborIds, $excludeIds, $favoriteWeight);

        if ([] === $scores) {
            return [];
        }

        arsort($scores);

        return array_slice(array_keys($scores), 0, $limit);
    }

    /**
     * Voisins = utilisateurs ayant favorisé OU visité au moins un lieu de référence.
     *
     * @param int[] $seedActivityIds
     *
     * @return int[] IDs utilisateurs (hors $userId)
     */
    private function findNeighborUserIds(int $userId, array $seedActivityIds): array
    {
        $em = $this->getEntityManager();

        /** @var list<int> $visitedNeighbors */
        $visitedNeighbors = $em
            ->createQuery(
                'SELECT DISTINCT u.id FROM App\Entity\User u
                 JOIN u.visitedActivities a
                 WHERE a.id IN (:seed) AND u.id != :uid'
            )
            ->setParameter('seed', $seedActivityIds)
            ->setParameter('uid', $userId)
            ->getSingleColumnResult();

        /** @var list<int> $favoriteNeighbors */
        $favoriteNeighbors = $em
            ->createQuery(
                'SELECT DISTINCT u.id FROM App\Entity\User u
                 JOIN u.favorites a
                 WHERE a.id IN (:seed) AND u.id != :uid'
            )
            ->setParameter('seed', $seedActivityIds)
            ->setParameter('uid', $userId)
            ->getSingleColumnResult();

        $ids = array_map('intval', [...$visitedNeighbors, ...$favoriteNeighbors]);

        return array_values(array_unique($ids));
    }

    /**
     * Ajoute au tableau de scores (par référence) l'engagement des voisins sur
     * une relation donnée (visitedBy / favoritedBy), pondéré.
     *
     * @param array<int, float> $scores      (référence) activityId => score
     * @param string            $relation    'visitedBy' | 'favoritedBy'
     * @param int[]             $neighborIds
     * @param int[]             $excludeIds
     */
    private function accumulateRelationScores(array &$scores, string $relation, array $neighborIds, array $excludeIds, float $weight): void
    {
        $qb = $this->createQueryBuilder('a')
            ->select('a.id AS aid', 'COUNT(u.id) AS cnt')
            ->join('a.' . $relation, 'u')
            ->where('u.id IN (:neighbors)')
            ->andWhere('a.isPublished = :pub')
            ->setParameter('neighbors', $neighborIds)
            ->setParameter('pub', true)
            ->groupBy('a.id');

        if ([] !== $excludeIds) {
            $qb->andWhere('a.id NOT IN (:excl)')->setParameter('excl', $excludeIds);
        }

        /** @var list<array{aid: int, cnt: int}> $rows */
        $rows = $qb->getQuery()->getResult();

        foreach ($rows as $row) {
            $aid = (int) $row['aid'];
            $scores[$aid] = ($scores[$aid] ?? 0.0) + ((int) $row['cnt']) * $weight;
        }
    }

    //    /**
    //     * @return Activity[] Returns an array of Activity objects
    //     */
    //    public function findByExampleField($value): array
    //    {
    //        return $this->createQueryBuilder('a')
    //            ->andWhere('a.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->orderBy('a.id', 'ASC')
    //            ->setMaxResults(10)
    //            ->getQuery()
    //            ->getResult()
    //        ;
    //    }

    //    public function findOneBySomeField($value): ?Activity
    //    {
    //        return $this->createQueryBuilder('a')
    //            ->andWhere('a.exampleField = :val')
    //            ->setParameter('val', $value)
    //            ->getQuery()
    //            ->getOneOrNullResult()
    //        ;
    //    }
}
