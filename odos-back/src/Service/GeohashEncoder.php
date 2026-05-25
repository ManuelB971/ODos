<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Encode / décode geohash (base32) pour la grille d'exploration carte.
 */
final class GeohashEncoder
{
    private const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

    public static function encode(float $latitude, float $longitude, int $precision = 6): string
    {
        $precision = max(1, min(12, $precision));
        $latInterval = [-90.0, 90.0];
        $lngInterval = [-180.0, 180.0];
        $hash = '';
        $bit = 0;
        $ch = 0;
        $even = true;

        while (strlen($hash) < $precision) {
            if ($even) {
                $mid = ($lngInterval[0] + $lngInterval[1]) / 2;
                if ($longitude > $mid) {
                    $ch |= 1 << (4 - $bit);
                    $lngInterval[0] = $mid;
                } else {
                    $lngInterval[1] = $mid;
                }
            } else {
                $mid = ($latInterval[0] + $latInterval[1]) / 2;
                if ($latitude > $mid) {
                    $ch |= 1 << (4 - $bit);
                    $latInterval[0] = $mid;
                } else {
                    $latInterval[1] = $mid;
                }
            }

            $even = !$even;
            if ($bit < 4) {
                ++$bit;
            } else {
                $hash .= self::BASE32[$ch];
                $bit = 0;
                $ch = 0;
            }
        }

        return $hash;
    }

    /**
     * @return array{minLat: float, minLng: float, maxLat: float, maxLng: float}
     */
    public static function decodeBounds(string $hash): array
    {
        $latInterval = [-90.0, 90.0];
        $lngInterval = [-180.0, 180.0];
        $even = true;

        foreach (str_split($hash) as $char) {
            $pos = strpos(self::BASE32, $char);
            if (false === $pos) {
                continue;
            }
            for ($bit = 4; $bit >= 0; --$bit) {
                $mask = 1 << $bit;
                if ($even) {
                    if ($pos & $mask) {
                        $lngInterval[0] = ($lngInterval[0] + $lngInterval[1]) / 2;
                    } else {
                        $lngInterval[1] = ($lngInterval[0] + $lngInterval[1]) / 2;
                    }
                } else {
                    if ($pos & $mask) {
                        $latInterval[0] = ($latInterval[0] + $latInterval[1]) / 2;
                    } else {
                        $latInterval[1] = ($latInterval[0] + $latInterval[1]) / 2;
                    }
                }
                $even = !$even;
            }
        }

        return [
            'minLat' => $latInterval[0],
            'minLng' => $lngInterval[0],
            'maxLat' => $latInterval[1],
            'maxLng' => $lngInterval[1],
        ];
    }
}
