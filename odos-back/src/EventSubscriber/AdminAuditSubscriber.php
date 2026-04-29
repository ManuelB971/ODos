<?php

namespace App\EventSubscriber;

use App\Entity\AdminAuditLog;
use App\Entity\User;
use App\Service\AdminAuditLogger;
use EasyCorp\Bundle\EasyAdminBundle\Event\AfterEntityDeletedEvent;
use EasyCorp\Bundle\EasyAdminBundle\Event\AfterEntityPersistedEvent;
use EasyCorp\Bundle\EasyAdminBundle\Event\AfterEntityUpdatedEvent;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;

class AdminAuditSubscriber implements EventSubscriberInterface
{
    public function __construct(
        private readonly LoggerInterface $logger,
        private readonly Security $security,
        private readonly AdminAuditLogger $adminAuditLogger,
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

    /**
     * @param AfterEntityPersistedEvent<object> $event
     */
    public function onAfterEntityPersisted(AfterEntityPersistedEvent $event): void
    {
        $entity = $event->getEntityInstance();
        if ($entity instanceof AdminAuditLog) {
            return;
        }
        $admin = $this->security->getUser()?->getUserIdentifier() ?? 'System';

        if ($entity instanceof User) {
            $summary = sprintf('Admin "%s" a créé un nouvel utilisateur: %s', $admin, $entity->getEmail());
            $this->logger->info(sprintf('[AUDIT] %s', $summary));
            $this->adminAuditLogger->log('CREATE', $this->shortClassName($entity), $this->extractEntityId($entity), $summary, 'info');
        } else {
            $summary = sprintf('Admin "%s" a créé une nouvelle entité: %s', $admin, get_class($entity));
            $this->logger->info(sprintf('[AUDIT] %s', $summary));
            $this->adminAuditLogger->log('CREATE', $this->shortClassName($entity), $this->extractEntityId($entity), $summary, 'info');
        }
    }

    /**
     * @param AfterEntityUpdatedEvent<object> $event
     */
    public function onAfterEntityUpdated(AfterEntityUpdatedEvent $event): void
    {
        $entity = $event->getEntityInstance();
        if ($entity instanceof AdminAuditLog) {
            return;
        }
        $admin = $this->security->getUser()?->getUserIdentifier() ?? 'System';

        if ($entity instanceof User) {
            $summary = sprintf('Admin "%s" a modifié l\'utilisateur: %s (Rôles actuels: %s)', $admin, $entity->getEmail(), implode(', ', $entity->getRoles()));
            $this->logger->info(sprintf('[AUDIT] %s', $summary));
            $this->adminAuditLogger->log('UPDATE', $this->shortClassName($entity), $this->extractEntityId($entity), $summary, 'info');
        } else {
            $summary = sprintf('Admin "%s" a modifié une entité: %s (ID: %s)', $admin, get_class($entity), method_exists($entity, 'getId') ? $entity->getId() : 'inconnu');
            $this->logger->info(sprintf('[AUDIT] %s', $summary));
            $this->adminAuditLogger->log('UPDATE', $this->shortClassName($entity), $this->extractEntityId($entity), $summary, 'info');
        }
    }

    /**
     * @param AfterEntityDeletedEvent<object> $event
     */
    public function onAfterEntityDeleted(AfterEntityDeletedEvent $event): void
    {
        $entity = $event->getEntityInstance();
        if ($entity instanceof AdminAuditLog) {
            return;
        }
        $admin = $this->security->getUser()?->getUserIdentifier() ?? 'System';

        if ($entity instanceof User) {
            $summary = sprintf('Admin "%s" a supprimé l\'utilisateur: %s', $admin, $entity->getEmail());
            $this->logger->warning(sprintf('[AUDIT] %s', $summary));
            $this->adminAuditLogger->log('DELETE', $this->shortClassName($entity), $this->extractEntityId($entity), $summary, 'warning');
        } else {
            $summary = sprintf('Admin "%s" a supprimé une entité: %s', $admin, get_class($entity));
            $this->logger->info(sprintf('[AUDIT] %s', $summary));
            $this->adminAuditLogger->log('DELETE', $this->shortClassName($entity), $this->extractEntityId($entity), $summary, 'info');
        }
    }

    private function shortClassName(object $entity): string
    {
        $fqcn = get_class($entity);
        $parts = explode('\\', $fqcn);

        return (string) end($parts);
    }

    private function extractEntityId(object $entity): ?string
    {
        if (!method_exists($entity, 'getId')) {
            return null;
        }

        try {
            $id = $entity->getId();

            return null !== $id ? (string) $id : null;
        } catch (\Throwable) {
            return null;
        }
    }
}
