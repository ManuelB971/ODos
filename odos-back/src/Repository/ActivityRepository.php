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
