<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Service\AdminAuditLogger;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

final class AdminCriticalRouteAccessSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly Security $security,
        private readonly AdminAuditLogger $adminAuditLogger,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => 'onKernelRequest',
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        $path = $request->getPathInfo();
        $route = (string) $request->attributes->get('_route', '');

        if (!str_starts_with($path, '/admin')) {
            return;
        }
        if (str_starts_with($path, '/admin/mfa')) {
            return;
        }
        if (!$this->security->isGranted('ROLE_ADMIN')) {
            return;
        }

        $method = $request->getMethod();
        $isCriticalWriteMethod = in_array($method, ['POST', 'PATCH', 'PUT', 'DELETE'], true);
        $isCriticalRoute = str_contains($route, '_delete')
            || str_contains($route, '_edit')
            || str_contains($route, '_new')
            || str_contains($route, 'admin_logs_export_csv')
            || str_contains($route, 'admin_audit_log');

        if (!$isCriticalWriteMethod && !$isCriticalRoute) {
            return;
        }

        $this->adminAuditLogger->log(
            'ACCESS',
            'Route',
            null,
            sprintf('Accès route admin critique: %s', $route !== '' ? $route : $path),
            'info',
            [
                'path' => $path,
                'method' => $method,
            ]
        );
    }
}
