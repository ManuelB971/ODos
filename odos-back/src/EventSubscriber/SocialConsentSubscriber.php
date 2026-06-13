<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Entity\User;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Security\Core\Authentication\Token\Storage\TokenStorageInterface;

/**
 * Bloque l'accès aux endpoints sociaux si l'utilisateur n'a pas consenti.
 */
final class SocialConsentSubscriber implements EventSubscriberInterface
{
    private const CONSENT_ROUTE = 'api_me_social_consent';

    /** @var list<string> */
    private const PREFIXES = [
        '/api/forum',
        '/api/friendships',
        '/api/groups',
        '/api/shared-activities',
        '/api/social',
        '/api/group-invitations',
        '/api/chat',
    ];

    public function __construct(
        private readonly TokenStorageInterface $tokenStorage,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 7],
        ];
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        $path = $request->getPathInfo();
        $route = $request->attributes->get('_route');

        if (self::CONSENT_ROUTE === $route) {
            return;
        }

        $isSocial = false;
        foreach (self::PREFIXES as $prefix) {
            if (str_starts_with($path, $prefix)) {
                $isSocial = true;
                break;
            }
        }

        if (!$isSocial) {
            return;
        }

        $token = $this->tokenStorage->getToken();
        $user = $token?->getUser();
        if (!$user instanceof User) {
            return;
        }

        if (!$user->hasSocialConsent()) {
            $event->setResponse(new JsonResponse(
                ['message' => 'Consentement aux fonctionnalités communautaires requis.', 'code' => 'SOCIAL_CONSENT_REQUIRED'],
                Response::HTTP_FORBIDDEN
            ));
        }
    }
}
