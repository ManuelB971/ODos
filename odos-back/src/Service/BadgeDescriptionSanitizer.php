<?php

declare(strict_types=1);

namespace App\Service;

/**
 * Descriptions de badges affichées en texte brut dans l'app mobile (pas de HTML).
 */
final class BadgeDescriptionSanitizer
{
    public function toPlainText(string $raw): string
    {
        $text = preg_replace('/<\s*br\s*\/?>/i', ' ', $raw) ?? $raw;
        $text = preg_replace('/<\/\s*(p|div|li|h[1-6])\s*>/i', ' ', $text) ?? $text;
        $text = strip_tags($text);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $text = preg_replace('/\s+/u', ' ', $text) ?? '';

        return trim($text);
    }
}
