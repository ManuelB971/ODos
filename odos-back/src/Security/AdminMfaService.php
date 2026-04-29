<?php

namespace App\Security;

class AdminMfaService
{
    public function isConfigured(): bool
    {
        return '' !== $this->getPinFromEnv() && '' !== $this->getTotpSecretFromEnv();
    }

    public function isBiometricRequired(): bool
    {
        return filter_var($_ENV['ADMIN_MFA_REQUIRE_BIOMETRIC'] ?? getenv('ADMIN_MFA_REQUIRE_BIOMETRIC') ?: '1', FILTER_VALIDATE_BOOL);
    }

    public function isPinValid(string $pinInput): bool
    {
        $expected = $this->getPinFromEnv();
        if ('' === $expected || '' === $pinInput) {
            return false;
        }

        return hash_equals($expected, $pinInput);
    }

    public function isTotpValid(string $code, int $window = 1): bool
    {
        $secret = $this->getTotpSecretFromEnv();
        if ('' === $secret) {
            return false;
        }

        $normalizedCode = preg_replace('/\D+/', '', $code);
        if (!is_string($normalizedCode) || 6 !== strlen($normalizedCode)) {
            return false;
        }

        $currentSlice = (int) floor(time() / 30);
        for ($i = -$window; $i <= $window; ++$i) {
            if (hash_equals($this->totp($secret, $currentSlice + $i), $normalizedCode)) {
                return true;
            }
        }

        return false;
    }

    public function buildTotpUri(string $accountName, ?string $issuer = null): string
    {
        $secret = $this->getTotpSecretFromEnv();
        if ($secret === '') {
            throw new \RuntimeException('ADMIN_MFA_TOTP_SECRET non configure.');
        }

        $issuer = trim((string) ($issuer ?? $this->getTotpIssuerFromEnv()));
        if ($issuer === '') {
            $issuer = 'ODos';
        }

        $label = rawurlencode(sprintf('%s:%s', $issuer, trim($accountName)));

        return sprintf(
            'otpauth://totp/%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30',
            $label,
            rawurlencode($secret),
            rawurlencode($issuer)
        );
    }

    private function getPinFromEnv(): string
    {
        $value = $_ENV['ADMIN_MFA_PIN'] ?? getenv('ADMIN_MFA_PIN') ?: '';

        return trim((string) $value);
    }

    private function getTotpSecretFromEnv(): string
    {
        $value = $_ENV['ADMIN_MFA_TOTP_SECRET'] ?? getenv('ADMIN_MFA_TOTP_SECRET') ?: '';

        return strtoupper(trim((string) $value));
    }

    private function getTotpIssuerFromEnv(): string
    {
        $value = $_ENV['ADMIN_MFA_TOTP_ISSUER'] ?? getenv('ADMIN_MFA_TOTP_ISSUER') ?: 'ODos';

        return trim((string) $value);
    }

    private function totp(string $base32Secret, int $timeSlice): string
    {
        $secret = $this->base32Decode($base32Secret);
        if ('' === $secret) {
            return '000000';
        }

        $time = pack('N*', 0).pack('N*', $timeSlice);
        $hash = hash_hmac('sha1', $time, $secret, true);
        $offset = ord(substr($hash, -1)) & 0x0F;
        $truncatedHash = substr($hash, $offset, 4);
        $unpacked = unpack('N', $truncatedHash);
        $value = isset($unpacked[1]) ? (((int) $unpacked[1]) & 0x7FFFFFFF) : 0;

        return str_pad((string) ($value % 1000000), 6, '0', STR_PAD_LEFT);
    }

    private function base32Decode(string $value): string
    {
        $alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        $value = strtoupper(rtrim($value, '='));

        $bits = '';
        $output = '';

        foreach (str_split($value) as $char) {
            $pos = strpos($alphabet, $char);
            if (false === $pos) {
                continue;
            }

            $bits .= str_pad(decbin($pos), 5, '0', STR_PAD_LEFT);
        }

        foreach (str_split($bits, 8) as $byte) {
            if (8 !== strlen($byte)) {
                continue;
            }

            $output .= chr((int) bindec($byte));
        }

        return $output;
    }
}
