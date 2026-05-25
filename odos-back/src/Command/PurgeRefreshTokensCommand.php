<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\RefreshToken;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:refresh-token:purge',
    description: 'Supprime les refresh tokens JWT expirés (minimisation RGPD).',
)]
class PurgeRefreshTokensCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $entityManager,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $now = new \DateTimeImmutable();

        $deleted = $this->entityManager->createQueryBuilder()
            ->delete(RefreshToken::class, 'r')
            ->where('r.valid < :now')
            ->setParameter('now', $now)
            ->getQuery()
            ->execute();

        $io->success(sprintf('%d refresh token(s) expiré(s) supprimé(s).', $deleted));

        return Command::SUCCESS;
    }
}
