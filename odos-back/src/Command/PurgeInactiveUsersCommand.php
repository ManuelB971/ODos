<?php

declare(strict_types=1);

namespace App\Command;

use App\Repository\UserRepository;
use App\Service\UserDeletionService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

/**
 * Supprime les comptes sans connexion depuis N mois (RGPD art. 5.1.e — limitation de
 * la conservation ; la CNIL recommande de purger les comptes inactifs). Même
 * suppression que « Supprimer mon compte » (`UserDeletionService`). Les comptes
 * administrateurs ne sont jamais purgés. `--dry-run` liste sans supprimer.
 */
#[AsCommand(
    name: 'app:inactive-users:purge',
    description: 'Supprime les comptes utilisateurs inactifs depuis plus de N mois.',
)]
class PurgeInactiveUsersCommand extends Command
{
    public const DEFAULT_MONTHS = 36;

    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly UserDeletionService $userDeletionService,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addOption('months', null, InputOption::VALUE_REQUIRED, 'Inactivité au-delà de laquelle le compte est supprimé (mois).', (string) self::DEFAULT_MONTHS)
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Compte les comptes concernés sans les supprimer.');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $months = (int) $input->getOption('months');
        if ($months < 12) {
            $io->error('La valeur --months doit être >= 12.');

            return Command::INVALID;
        }

        $cutoff = (new \DateTimeImmutable('today'))->modify(sprintf('-%d months', $months));
        $dryRun = (bool) $input->getOption('dry-run');
        $deleted = 0;

        foreach ($this->userRepository->findInactiveSince($cutoff) as $user) {
            if (in_array('ROLE_ADMIN', $user->getRoles(), true)) {
                continue;
            }
            if (!$dryRun) {
                $this->userDeletionService->deleteUserAccount($user);
            }
            ++$deleted;
        }

        $io->success(sprintf(
            '%d compte(s) inactif(s) depuis le %s %s.',
            $deleted,
            $cutoff->format('Y-m-d'),
            $dryRun ? 'à supprimer (simulation)' : 'supprimé(s)',
        ));

        return Command::SUCCESS;
    }
}
