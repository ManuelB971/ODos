<?php

declare(strict_types=1);

namespace App\Theme;

/**
 * Source de vérité unique des clés de palette ODOS.
 *
 * Miroir exact de `OdosColorPalette` côté mobile
 * (odos-front/constants/themes/types.ts) et de la liste `PALETTE_KEYS`
 * du hook `useThemes`. Toute évolution doit être répercutée des deux côtés.
 */
final class PaletteSchema
{
    /** @var list<string> */
    public const KEYS = [
        'text',
        'background',
        'tint',
        'icon',
        'tabIconDefault',
        'tabIconSelected',
        'primary',
        'accent',
        'accentHover',
        'accentSoft',
        'turquoise',
        'surface',
        'elevated',
        'border',
        'muted',
        'danger',
        'mapPrimaryCta',
        'mapSecondary',
        'mapAccent',
        'overlay',
        'onAccent',
        'successSurface',
        'successText',
        'errorSurface',
    ];

    private function __construct()
    {
    }

    /**
     * Clés absentes, non-string ou vides — vide si la palette est complète.
     *
     * @param array<string, mixed> $palette
     *
     * @return list<string>
     */
    public static function missingKeys(array $palette): array
    {
        $missing = [];
        foreach (self::KEYS as $key) {
            if (!\array_key_exists($key, $palette) || !\is_string($palette[$key]) || '' === trim($palette[$key])) {
                $missing[] = $key;
            }
        }

        return $missing;
    }

    /**
     * @param array<string, mixed> $palette
     */
    public static function isComplete(array $palette): bool
    {
        return [] === self::missingKeys($palette);
    }

    /**
     * Palette nettoyée et restreinte aux clés connues (trim, cast string).
     * À n'appeler que sur une palette déjà jugée complète.
     *
     * @param array<string, mixed> $palette
     *
     * @return array<string, string>
     */
    public static function normalize(array $palette): array
    {
        $normalized = [];
        foreach (self::KEYS as $key) {
            $normalized[$key] = trim((string) ($palette[$key] ?? ''));
        }

        return $normalized;
    }
}
