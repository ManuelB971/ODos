<?php

declare(strict_types=1);

namespace App\Command;

use App\Repository\UserRepository;
use App\Service\AliasGenerator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:users:backfill-aliases',
    description: 'Attribue un alias public (dérivé de l\'e-mail) à tous les comptes qui n\'en ont pas, pour les rendre trouvables dans la recherche d\'amis.',
)]
final class BackfillUserAliasCommand extends Command
{
    public function __construct(
        private readonly UserRepository $userRepository,
        private readonly AliasGenerator $aliasGenerator,
        private readonly EntityManagerInterface $em,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $users = $this->userRepository->findWithoutAlias();

        if ([] === $users) {
            $io->success('Tous les comptes ont déjà un alias.');

            return Command::SUCCESS;
        }

        /** @var list<string> $reserved */
        $reserved = [];
        $count = 0;
        foreach ($users as $user) {
            $email = $user->getEmail();
            if (null === $email || '' === $email) {
                continue;
            }

            $alias = $this->aliasGenerator->fromEmail($email, $reserved);
            $user->setAlias($alias);
            $reserved[] = $alias;
            ++$count;
        }

        $this->em->flush();
        $io->success(sprintf('%d alias attribué(s).', $count));

        return Command::SUCCESS;
    }
}
