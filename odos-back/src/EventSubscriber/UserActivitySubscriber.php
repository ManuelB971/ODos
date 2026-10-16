<?php

declare(strict_types=1);

namespace App\EventSubscriber;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Lexik\Bundle\JWTAuthenticationBundle\Event\JWTCreatedEvent;
use Lexik\Bundle\JWTAuthenticationBundle\Events;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

/**
 * Note la dernière activité d'un compte à chaque émission de JWT (connexion email,
 * Google/Apple ou rafraîchissement). Le refresh token dure 30 j, donc un compte
 * utilisé est vu au moins une fois par mois. Au plus une écriture par jour et par
 * compte, en requête directe pour ne pas vider l'unité de travail en cours.
 */
final class UserActivitySubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [Events::JWT_CREATED => 'onJwtCreated'];
    }

    public function onJwtCreated(JWTCreatedEvent $event): void
    {
        $user = $event->getUser();
        if (!$user instanceof User) {
            return;
        }

        $today = new \DateTimeImmutable('today');
        $last = $user->getLastActiveAt();
        if (null !== $last && $last >= $today) {
            return;
        }

        $this->em->createQueryBuilder()
            ->update(User::class, 'u')
            ->set('u.lastActiveAt', ':today')
            ->where('u.id = :id')
            ->setParameter('today', $today, 'datetime_immutable')
            ->setParameter('id', $user->getId())
            ->getQuery()
            ->execute();
        $user->setLastActiveAt($today);
    }
}
