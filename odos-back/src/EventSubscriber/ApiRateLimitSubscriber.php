<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\RateLimiter\RateLimiterFactory;

/**
 * Limite les tentatives sur login (5/min/IP) et inscription (3/h/IP).
 */
final class ApiRateLimitSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly RateLimiterFactory $apiLoginLimiter,
        private readonly RateLimiterFactory $apiRegisterLimiter,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 8],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        if (Request::METHOD_POST !== $request->getMethod()) {
            return;
        }

        $path = $request->getPathInfo();
        $limiter = match ($path) {
            '/api/login' => $this->apiLoginLimiter,
            '/api/users' => $this->apiRegisterLimiter,
            default => null,
        };

        if (null === $limiter) {
            return;
        }

        $limit = $limiter->create($this->resolveClientKey($request))->consume();
        if (!$limit->isAccepted()) {
            $retryAfter = $limit->getRetryAfter()->getTimestamp() - time();
            throw new TooManyRequestsHttpException(
                max(1, $retryAfter),
                'Trop de tentatives. Réessayez plus tard.'
            );
        }
    }

    private function resolveClientKey(Request $request): string
    {
        return $request->getClientIp() ?? 'unknown';
    }
}
