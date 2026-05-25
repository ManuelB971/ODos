<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\UserMapCell;
use App\Repository\ActivityRepository;

/**
 * Zone d'exploration = ensemble des cellules geohash couvrant les activités publiées.
 */
final class MapExplorationZoneRegistry
{
    public const PRECISION = 6;

    /** @var array<string, array{zoneKey: string, precision: int, totalCells: int, cellIds: list<string>, bbox: array{west: float, south: float, east: float, north: float}>}|null */
    private ?array $cached = null;

    public function __construct(
        private readonly ActivityRepository $activityRepository,
    ) {
    }

    /**
     * @return array{zoneKey: string, precision: int, totalCells: int, cellIds: list<string>, bbox: array{west: float, south: float, east: float, north: float}}
     */
    public function getCatalogZone(): array
    {
        if (null !== $this->cached) {
            return $this->cached;
        }

        $coords = $this->activityRepository->findPublishedGeoCoordinates();
        $cellSet = [];
        $west = 180.0;
        $east = -180.0;
        $south = 90.0;
        $north = -90.0;

        foreach ($coords as $row) {
            $lat = (float) $row['latitude'];
            $lng = (float) $row['longitude'];
            $cellId = GeohashEncoder::encode($lat, $lng, self::PRECISION);
            $cellSet[$cellId] = true;
            $west = min($west, $lng);
            $east = max($east, $lng);
            $south = min($south, $lat);
            $north = max($north, $lat);
        }

        $cellIds = array_keys($cellSet);
        sort($cellIds);

        if ([] === $cellIds) {
            $this->cached = [
                'zoneKey' => UserMapCell::ZONE_CATALOG_V1,
                'precision' => self::PRECISION,
                'totalCells' => 0,
                'cellIds' => [],
                'bbox' => ['west' => -5.0, 'south' => 41.0, 'east' => 10.0, 'north' => 51.0],
            ];

            return $this->cached;
        }

        $pad = 0.08;
        $this->cached = [
            'zoneKey' => UserMapCell::ZONE_CATALOG_V1,
            'precision' => self::PRECISION,
            'totalCells' => count($cellIds),
            'cellIds' => $cellIds,
            'bbox' => [
                'west' => $west - $pad,
                'south' => $south - $pad,
                'east' => $east + $pad,
                'north' => $north + $pad,
            ],
        ];

        return $this->cached;
    }

    public function isValidCell(string $cellId): bool
    {
        $zone = $this->getCatalogZone();

        return in_array($cellId, $zone['cellIds'], true);
    }
}
