<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Détermine la locale de la requête à partir de l'en-tête `Accept-Language`,
 * contrainte aux langues supportées par l'app. Repli sur la locale par défaut.
 *
 * Permet à l'app mobile de recevoir des messages d'API traduits simplement en
 * envoyant `Accept-Language: fr|en|ar` (déjà géré nativement par les requêtes
 * HTTP de l'appareil).
 */
final class LocaleSubscriber implements EventSubscriberInterface
{
    /** @var list<string> */
    private const SUPPORTED = ['fr', 'en', 'ar'];

    public function __construct(
        private readonly string $defaultLocale = 'fr',
    ) {
    }

    public function onKernelRequest(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $request = $event->getRequest();
        $preferred = $request->getPreferredLanguage(self::SUPPORTED);
        $request->setLocale($preferred ?? $this->defaultLocale);
    }

    /**
     * @return array<string, array{0: string, 1: int}>
     */
    public static function getSubscribedEvents(): array
    {
        // Priorité élevée : avant le LocaleListener du framework et le routing.
        return [
            KernelEvents::REQUEST => ['onKernelRequest', 20],
        ];
    }
}
