<?php

namespace App\EventSubscriber;

use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpKernel\Event\RequestEvent;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class AdminMfaSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly Security $security,
        private readonly UrlGeneratorInterface $urlGenerator,
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

        if (!str_starts_with($path, '/admin')) {
            return;
        }

        if (str_starts_with($path, '/admin/mfa')) {
            return;
        }

        $user = $this->security->getUser();
        if (null === $user || !$this->security->isGranted('ROLE_ADMIN')) {
            return;
        }

        if (!$request->hasSession()) {
            $event->setResponse(new RedirectResponse($this->urlGenerator->generate('app_admin_mfa')));

            return;
        }

        if ($request->getSession()->get('admin_mfa_passed', false)) {
            return;
        }

        $event->setResponse(new RedirectResponse($this->urlGenerator->generate('app_admin_mfa')));
    }
}
