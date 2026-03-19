<?php

namespace App\EventSubscriber;

use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Event\AfterEntityDeletedEvent;
use EasyCorp\Bundle\EasyAdminBundle\Event\AfterEntityPersistedEvent;
use EasyCorp\Bundle\EasyAdminBundle\Event\AfterEntityUpdatedEvent;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class AdminAuditSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private LoggerInterface $logger,
        private Security $security
    ) {
    }

    public static function getSubscribedEvents(): array
    {
        return [
            AfterEntityPersistedEvent::class => ['onAfterEntityPersisted'],
            AfterEntityUpdatedEvent::class => ['onAfterEntityUpdated'],
            AfterEntityDeletedEvent::class => ['onAfterEntityDeleted'],
        ];
    }

    public function onAfterEntityPersisted(AfterEntityPersistedEvent $event): void
    {
        $entity = $event->getEntityInstance();
        $admin = $this->security->getUser()?->getUserIdentifier() ?? 'System';

        if ($entity instanceof User) {
            $this->logger->info(sprintf('[AUDIT] Admin "%s" a créé un nouvel utilisateur: %s', $admin, $entity->getEmail()));
        } else {
            $this->logger->info(sprintf('[AUDIT] Admin "%s" a créé une nouvelle entité: %s', $admin, get_class($entity)));
        }
    }

    public function onAfterEntityUpdated(AfterEntityUpdatedEvent $event): void
    {
        $entity = $event->getEntityInstance();
        $admin = $this->security->getUser()?->getUserIdentifier() ?? 'System';

        if ($entity instanceof User) {
            $this->logger->info(sprintf('[AUDIT] Admin "%s" a modifié l\'utilisateur: %s (Rôles actuels: %s)', $admin, $entity->getEmail(), implode(', ', $entity->getRoles())));
        } else {
            $this->logger->info(sprintf('[AUDIT] Admin "%s" a modifié une entité: %s (ID: %s)', $admin, get_class($entity), method_exists($entity, 'getId') ? $entity->getId() : 'inconnu'));
        }
    }

    public function onAfterEntityDeleted(AfterEntityDeletedEvent $event): void
    {
        $entity = $event->getEntityInstance();
        $admin = $this->security->getUser()?->getUserIdentifier() ?? 'System';

        if ($entity instanceof User) {
            $this->logger->warning(sprintf('[AUDIT] Admin "%s" a supprimé l\'utilisateur: %s', $admin, $entity->getEmail()));
        } else {
            $this->logger->info(sprintf('[AUDIT] Admin "%s" a supprimé une entité: %s', $admin, get_class($entity)));
        }
    }
}
