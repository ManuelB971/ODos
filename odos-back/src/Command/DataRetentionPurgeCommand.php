<?php

declare(strict_types=1);

namespace App\Command;

use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\ArrayInput;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Point d'entrée unique pour les crons de rétention (Sprint 2 RGPD).
 */
#[AsCommand(
    name: 'app:data-retention:purge',
    description: 'Purge les refresh tokens expirés et les logs admin au-delà de la rétention.',
)]
class DataRetentionPurgeCommand extends Command
{
    protected function configure(): void
    {
        $this->addOption(
            'audit-days',
            null,
            InputOption::VALUE_REQUIRED,
            'Rétention des logs admin (jours).',
            '90'
        );
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $application = $this->getApplication();
        if (null === $application) {
            $io->error('Console Application indisponible.');

            return Command::FAILURE;
        }

        $io->title('Purge de rétention ODOS');

        $refreshCode = $application->find('app:refresh-token:purge')->run(new ArrayInput([]), $output);
        if (Command::SUCCESS !== $refreshCode) {
            return (int) $refreshCode;
        }

        $auditDays = (int) $input->getOption('audit-days');
        $auditCode = $application->find('app:admin-audit:purge')->run(
            new ArrayInput(['--days' => (string) $auditDays]),
            $output
        );

        return Command::SUCCESS === $auditCode ? Command::SUCCESS : (int) $auditCode;
    }
}
