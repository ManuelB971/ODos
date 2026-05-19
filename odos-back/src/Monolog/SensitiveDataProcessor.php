<?php

declare(strict_types=1);

namespace App\Monolog;

use Monolog\LogRecord;
use Monolog\Processor\ProcessorInterface;

/**
 * Masque mots de passe, tokens et en-têtes Authorization dans les logs applicatifs.
 */
final class SensitiveDataProcessor implements ProcessorInterface
{
    /** @var list<string> */
    private const SENSITIVE_KEYS = [
        'password',
        'plainpassword',
        'token',
        'refresh_token',
        'authorization',
        'secret',
        'api_key',
        'jwt',
    ];

    public function __invoke(LogRecord $record): LogRecord
    {
        return $record->with(
            message: $this->maskString($record->message),
            context: $this->maskArray($record->context),
            extra: $this->maskArray($record->extra),
        );
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return array<string, mixed>
     */
    private function maskArray(array $data): array
    {
        $masked = [];
        foreach ($data as $key => $value) {
            if ($this->isSensitiveKey((string) $key)) {
                $masked[$key] = '[REDACTED]';
                continue;
            }
            if (is_array($value)) {
                $masked[$key] = $this->maskArray($value);
                continue;
            }
            if (is_string($value)) {
                $masked[$key] = $this->maskString($value);
                continue;
            }
            $masked[$key] = $value;
        }

        return $masked;
    }

    private function isSensitiveKey(string $key): bool
    {
        $normalized = strtolower($key);

        foreach (self::SENSITIVE_KEYS as $needle) {
            if (str_contains($normalized, $needle)) {
                return true;
            }
        }

        return false;
    }

    private function maskString(string $value): string
    {
        $value = preg_replace('/Bearer\s+[A-Za-z0-9\-._~+\/]+=*/i', 'Bearer [REDACTED]', $value) ?? $value;
        $value = preg_replace('/"password"\s*:\s*"[^"]*"/i', '"password":"[REDACTED]"', $value) ?? $value;
        $value = preg_replace('/"refresh_token"\s*:\s*"[^"]*"/i', '"refresh_token":"[REDACTED]"', $value) ?? $value;

        return $value;
    }
}
