<?php

declare(strict_types=1);

namespace App\Command;

use App\Repository\AdminAuditLogRepository;
use App\Service\AdminAuditLogger;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:admin-audit:purge',
    description: 'Supprime les logs admin plus anciens que la durée de rétention.',
)]
class PurgeAdminAuditLogsCommand extends Command
{
    public function __construct(
        private readonly AdminAuditLogRepository $adminAuditLogRepository,
        private readonly AdminAuditLogger $adminAuditLogger,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption(
            'days',
            null,
            InputOption::VALUE_REQUIRED,
            'Nombre de jours à conserver (logs plus anciens purgés).',
            '90'
        );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $days = (int) $input->getOption('days');

        if ($days < 1) {
            $io->error('La valeur --days doit être >= 1.');

            return Command::INVALID;
        }

        $cutoff = (new \DateTimeImmutable())->modify(sprintf('-%d days', $days));
        $deleted = $this->adminAuditLogRepository->purgeOlderThan($cutoff);
        $this->adminAuditLogger->log(
            'PURGE',
            'AdminAuditLog',
            null,
            sprintf('Purge automatique des logs admin: %d supprimés (rétention %d jours)', $deleted, $days),
            'info',
            [
                'days' => $days,
                'cutoff' => $cutoff->format('Y-m-d H:i:s'),
                'deleted' => $deleted,
            ],
            'system'
        );

        $io->success(sprintf(
            '%d log(s) admin supprimé(s). Rétention appliquée: %d jours (avant %s).',
            $deleted,
            $days,
            $cutoff->format('Y-m-d H:i:s')
        ));

        return Command::SUCCESS;
    }
}
