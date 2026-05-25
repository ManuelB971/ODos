<?php

declare(strict_types=1);

namespace App\Service;

use App\Entity\AdminAuditLog;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\SecurityBundle\Security;
use Symfony\Component\HttpFoundation\RequestStack;

final class AdminAuditLogger
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly Security $security,
        private readonly RequestStack $requestStack,
        private readonly LoggerInterface $logger,
        private readonly EmailPseudonymizer $emailPseudonymizer,
    ) {
    }

    /**
     * @param array<string, mixed>|null $context
     */
    public function log(
        string $action,
        string $entityClass,
        ?string $entityId,
        string $summary,
        string $level = 'info',
        ?array $context = null,
        ?string $adminEmail = null,
    ): void {
        try {
            $request = $this->requestStack->getCurrentRequest();
            $rawEmail = $adminEmail ?? $this->security->getUser()?->getUserIdentifier();
            $mergedContext = array_merge(
                [
                    'route' => $request?->attributes->get('_route'),
                    'method' => $request?->getMethod(),
                    'ip' => $request?->getClientIp(),
                ],
                $context ?? []
            );
            if (is_string($rawEmail) && '' !== $rawEmail) {
                $mergedContext['adminEmailHash'] = $this->emailPseudonymizer->hash($rawEmail);
            }

            $audit = new AdminAuditLog();
            $audit->setAdminEmail(
                is_string($rawEmail) && '' !== $rawEmail
                    ? $this->emailPseudonymizer->pseudonymize($rawEmail)
                    : null
            );
            $audit->setAction($action);
            $audit->setEntityClass($entityClass);
            $audit->setEntityId($entityId);
            $audit->setSummary($summary);
            $audit->setLevel($level);
            $audit->setContext($mergedContext);

            $this->entityManager->persist($audit);
            $this->entityManager->flush();
        } catch (\Throwable $e) {
            $this->logger->error('[AUDIT] Echec persistance audit admin', [
                'exception' => $e,
                'action' => $action,
                'entity_class' => $entityClass,
            ]);
        }
    }
}
