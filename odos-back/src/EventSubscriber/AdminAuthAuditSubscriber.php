<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Service\AdminAuditLogger;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Component\Security\Http\Event\LoginFailureEvent;
use Symfony\Component\Security\Http\Event\LoginSuccessEvent;
use Symfony\Component\Security\Http\Event\LogoutEvent;

final class AdminAuthAuditSubscriber implements EventSubscriberInterface
{
    private const FAILED_LOGIN_THRESHOLD = 3;
    private const FAILED_LOGIN_WINDOW_SECONDS = 900;

    public function __construct(
        private readonly AdminAuditLogger $adminAuditLogger,
        private readonly CacheItemPoolInterface $cache,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            LoginSuccessEvent::class => 'onLoginSuccess',
            LoginFailureEvent::class => 'onLoginFailure',
            LogoutEvent::class => 'onLogout',
        ];
    }

    public function onLoginSuccess(LoginSuccessEvent $event): void
    {
        $user = $event->getUser();
        if (!in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            return;
        }

        $email = (string) $user->getUserIdentifier();
        $this->resetFailedAttempts($event->getRequest()->getClientIp(), $email);

        $this->adminAuditLogger->log(
            'LOGIN',
            'Auth',
            null,
            sprintf('Connexion admin réussie: %s', '' !== $email ? $email : 'admin'),
            'info',
            [
                'firewall' => $event->getFirewallName(),
                'http_status' => 200,
            ],
            $email
        );
    }

    public function onLoginFailure(LoginFailureEvent $event): void
    {
        $request = $event->getRequest();
        $identifier = trim((string) ($request->request->get('email') ?? $request->request->get('username') ?? 'unknown'));
        $ip = (string) ($request->getClientIp() ?? 'unknown');
        $attempts = $this->incrementFailedAttempts($ip, $identifier);
        $isSuspicious = $attempts >= self::FAILED_LOGIN_THRESHOLD;

        $this->adminAuditLogger->log(
            'LOGIN_FAILED',
            'Auth',
            null,
            sprintf('Connexion échouée (%s) - tentative #%d', $identifier, $attempts),
            $isSuspicious ? 'error' : 'warning',
            [
                'firewall' => $event->getFirewallName(),
                'http_status' => 401,
                'ip' => $ip,
                'failed_attempts' => $attempts,
                'suspicious' => $isSuspicious,
                'reason' => $event->getException()->getMessageKey(),
            ],
            $identifier !== 'unknown' ? $identifier : null
        );
    }

    public function onLogout(LogoutEvent $event): void
    {
        $token = $event->getToken();
        $user = $token?->getUser();
        if (!$user instanceof UserInterface || !in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            return;
        }

        $email = (string) $user->getUserIdentifier();

        $this->adminAuditLogger->log(
            'LOGOUT',
            'Auth',
            null,
            sprintf('Déconnexion admin: %s', '' !== $email ? $email : 'admin'),
            'info',
            [
                'route' => $event->getRequest()->attributes->get('_route'),
                'http_status' => 200,
            ],
            $email
        );
    }

    private function incrementFailedAttempts(string $ip, string $identifier): int
    {
        $item = $this->cache->getItem($this->buildFailedAttemptsKey($ip, $identifier));
        $attempts = (int) $item->get() + 1;
        $item->set($attempts);
        $item->expiresAfter(self::FAILED_LOGIN_WINDOW_SECONDS);
        $this->cache->save($item);

        return $attempts;
    }

    private function resetFailedAttempts(?string $ip, string $identifier): void
    {
        $this->cache->deleteItem($this->buildFailedAttemptsKey((string) ($ip ?? 'unknown'), $identifier));
    }

    private function buildFailedAttemptsKey(string $ip, string $identifier): string
    {
        return sprintf('auth_failed_%s_%s', sha1($ip), sha1($identifier));
    }
}
