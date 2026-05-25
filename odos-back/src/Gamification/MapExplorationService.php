<?php

declare(strict_types=1);

namespace App\Gamification;

use App\Entity\User;
use App\Entity\UserMapCell;
use App\Repository\UserMapCellRepository;
use App\Service\GeohashEncoder;
use App\Service\MapExplorationZoneRegistry;
use Doctrine\ORM\EntityManagerInterface;

final class MapExplorationService
{
    private const MAX_SYNC_CELLS = 40;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly MapExplorationZoneRegistry $zoneRegistry,
        private readonly UserMapCellRepository $cellRepository,
        private readonly GamificationService $gamificationService,
    ) {
    }

    /**
     * @return array<string, mixed>
     */
    public function buildOverview(User $user): array
    {
        $zone = $this->zoneRegistry->getCatalogZone();
        $active = $user->isMapExplorationActive();
        $visitedCount = $active
            ? $this->cellRepository->countForUserInZone($user, $zone['zoneKey'])
            : 0;
        $total = $zone['totalCells'];
        $percent = $active && $total > 0 ? round(($visitedCount / $total) * 100, 1) : 0.0;

        return [
            'zoneKey' => $zone['zoneKey'],
            'precision' => $zone['precision'],
            'bbox' => $zone['bbox'],
            'totalCells' => $total,
            'visitedCount' => $visitedCount,
            'percent' => $percent,
            'enabled' => $user->isMapExplorationEnabled(),
            'consented' => null !== $user->getMapExplorationConsentAt(),
            'active' => $active,
            'consentedAt' => $user->getMapExplorationConsentAt()?->format(\DateTimeInterface::ATOM),
            'visitedCellIds' => $active
                ? $this->cellRepository->findCellIdsForUser($user, $zone['zoneKey'])
                : [],
        ];
    }

    public function recordConsent(User $user): void
    {
        if (null === $user->getMapExplorationConsentAt()) {
            $user->setMapExplorationConsentAt(new \DateTimeImmutable());
        }
        $user->setMapExplorationEnabled(true);
        $this->em->flush();
    }

    public function setEnabled(User $user, bool $enabled): void
    {
        $user->setMapExplorationEnabled($enabled);
        $this->em->flush();
    }

    /**
     * @param list<string> $cellIds
     *
     * @return array{overview: array<string, mixed>, unlockedBadges: list<array<string, mixed>>}
     */
    public function syncCells(User $user, array $cellIds): array
    {
        if (!$user->isMapExplorationActive()) {
            throw new \InvalidArgumentException('Exploration carte désactivée ou non consentie.');
        }

        $zone = $this->zoneRegistry->getCatalogZone();
        $unique = array_unique(array_slice(array_filter($cellIds, 'is_string'), 0, self::MAX_SYNC_CELLS));
        $newCount = 0;

        foreach ($unique as $cellId) {
            $cellId = strtolower(trim($cellId));
            if (strlen($cellId) < 4 || strlen($cellId) > 12 || !$this->zoneRegistry->isValidCell($cellId)) {
                continue;
            }

            $existing = $this->cellRepository->findOneForUserAndCell($user, $cellId);
            if ($existing instanceof UserMapCell) {
                $existing->touch();
                continue;
            }

            $cell = new UserMapCell();
            $cell->setUser($user);
            $cell->setCellId($cellId);
            $cell->setZoneKey($zone['zoneKey']);
            $this->em->persist($cell);
            ++$newCount;
        }

        if ($newCount > 0) {
            $this->em->flush();
        }

        $unlocked = $this->gamificationService->evaluateAndAward($user, 'map_cells_synced');

        return [
            'overview' => $this->buildOverview($user),
            'unlockedBadges' => $unlocked,
        ];
    }

    public function explorationPercentForUser(User $user): float
    {
        if (!$user->isMapExplorationActive()) {
            return 0.0;
        }

        $overview = $this->buildOverview($user);

        return (float) $overview['percent'];
    }

    /**
     * GeoJSON FeatureCollection des cellules visitées (polygones bbox geohash).
     *
     * @return array<string, mixed>
     */
    public function visitedCellsGeoJson(User $user): array
    {
        if (!$user->isMapExplorationActive()) {
            return ['type' => 'FeatureCollection', 'features' => []];
        }

        $cellIds = $this->cellRepository->findCellIdsForUser($user, UserMapCell::ZONE_CATALOG_V1);
        $features = [];

        foreach ($cellIds as $cellId) {
            $b = GeohashEncoder::decodeBounds($cellId);
            $features[] = [
                'type' => 'Feature',
                'id' => $cellId,
                'properties' => ['cellId' => $cellId],
                'geometry' => [
                    'type' => 'Polygon',
                    'coordinates' => [[
                        [$b['minLng'], $b['minLat']],
                        [$b['maxLng'], $b['minLat']],
                        [$b['maxLng'], $b['maxLat']],
                        [$b['minLng'], $b['maxLat']],
                        [$b['minLng'], $b['minLat']],
                    ]],
                ],
            ];
        }

        return ['type' => 'FeatureCollection', 'features' => $features];
    }
}
