<?php

namespace App\Service;

/**
 * Minimal server-side sanitization for user comments (HTML stripped, whitespace normalized).
 */
final class CommentContentSanitizer
{
    public function sanitize(string $raw): string
    {
        $text = strip_tags($raw);
        $text = preg_replace('/\s+/u', ' ', $text) ?? '';

        return trim($text);
    }
}
