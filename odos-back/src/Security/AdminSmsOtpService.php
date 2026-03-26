<?php

namespace App\Security;

use GuzzleHttp\Client as GuzzleClient;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\ParameterBag\ParameterBagInterface;
use Twilio\Http\GuzzleClient as TwilioGuzzleClient;
use Twilio\Rest\Client;

class AdminSmsOtpService
{
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly ParameterBagInterface $parameterBag,
    ) {
    }

    public function isConfigured(): bool
    {
        return $this->getTwilioSid() !== '' && $this->getTwilioToken() !== '' && $this->getTwilioFrom() !== '';
    }

    public function generateOtp(): string
    {
        return (string) random_int(100000, 999999);
    }

    public function hashOtp(string $otp): string
    {
        return hash_hmac('sha256', $otp, $this->getHashSecret());
    }

    public function verifyOtp(string $otpInput, string $hash): bool
    {
        if ($otpInput === '' || $hash === '') {
            return false;
        }

        return hash_equals($hash, $this->hashOtp($otpInput));
    }

    public function sendOtp(string $toPhone, string $otp): void
    {
        if (!$this->isConfigured()) {
            throw new \RuntimeException('Twilio non configure.');
        }

        $client = $this->createTwilioClient();

        try {
            $client->messages->create($toPhone, [
                'from' => $this->getTwilioFrom(),
                'body' => sprintf('Votre code MFA admin ODos est: %s (expire dans 5 minutes).', $otp),
            ]);
        } catch (\Throwable $e) {
            $this->logger->error('Twilio SMS send failed', [
                'exception' => $e,
                'to' => $this->maskPhone($toPhone),
            ]);

            throw $e;
        }
    }

    private function createTwilioClient(): Client
    {
        $client = new Client($this->getTwilioSid(), $this->getTwilioToken());

        $caPath = $this->resolveTwilioCaPath();
        if (null !== $caPath) {
            $guzzle = new GuzzleClient([
                'timeout' => 30,
                'verify' => $caPath,
            ]);
            $client->setHttpClient(new TwilioGuzzleClient($guzzle));
        }

        return $client;
    }

    private function resolveTwilioCaPath(): ?string
    {
        $raw = trim((string) ($_ENV['TWILIO_CAINFO'] ?? getenv('TWILIO_CAINFO') ?: ''));
        if ($raw === '') {
            return null;
        }

        $path = $raw;
        if (!$this->isAbsoluteFilesystemPath($path)) {
            $projectDir = rtrim((string) $this->parameterBag->get('kernel.project_dir'), '/\\');
            $path = $projectDir.DIRECTORY_SEPARATOR.str_replace(['/', '\\'], DIRECTORY_SEPARATOR, ltrim($path, '/\\'));
        }

        return is_readable($path) ? $path : null;
    }

    private function isAbsoluteFilesystemPath(string $path): bool
    {
        if (str_starts_with($path, '/')) {
            return true;
        }

        return 1 === preg_match('/^[A-Za-z]:[\\\\\\/]/', $path);
    }

    private function maskPhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', $phone) ?? '';

        return strlen($digits) >= 4 ? '***'.substr($digits, -4) : '***';
    }

    private function getHashSecret(): string
    {
        $secret = (string) ($_ENV['APP_SECRET'] ?? getenv('APP_SECRET') ?: 'dev-secret');

        return $secret;
    }

    private function getTwilioSid(): string
    {
        return trim((string) ($_ENV['TWILIO_ACCOUNT_SID'] ?? getenv('TWILIO_ACCOUNT_SID') ?: ''));
    }

    private function getTwilioToken(): string
    {
        return trim((string) ($_ENV['TWILIO_AUTH_TOKEN'] ?? getenv('TWILIO_AUTH_TOKEN') ?: ''));
    }

    private function getTwilioFrom(): string
    {
        return trim((string) ($_ENV['TWILIO_FROM_NUMBER'] ?? getenv('TWILIO_FROM_NUMBER') ?: ''));
    }
}
