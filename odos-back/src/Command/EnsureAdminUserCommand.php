<?php

namespace App\Command;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:ensure-admin',
    description: 'Create or update the original admin user.'
)]
class EnsureAdminUserCommand extends Command
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $passwordHasher,
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('email', InputArgument::OPTIONAL, 'Admin email (identifier)', 'admin@odos.com')
            ->addArgument('password', InputArgument::OPTIONAL, 'Admin password (plain text)')
            ->addOption('promote-existing', null, InputOption::VALUE_NONE, 'If user exists, ensure ROLE_ADMIN is present')
            ->addOption('set-password', null, InputOption::VALUE_NONE, 'If user exists, set/overwrite password (requires password arg)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $email = (string) $input->getArgument('email');
        $password = $input->getArgument('password');
        $promoteExisting = (bool) $input->getOption('promote-existing');
        $setPassword = (bool) $input->getOption('set-password');

        /** @var User|null $user */
        $user = $this->users->findOneBy(['email' => $email]);

        if (!$user) {
            if (!is_string($password) || $password === '') {
                $output->writeln('<error>Password is required when creating a new admin.</error>');
                return Command::INVALID;
            }

            $user = new User();
            $user->setEmail($email);
            $user->setRoles(['ROLE_ADMIN']);
            $user->setPassword($this->passwordHasher->hashPassword($user, $password));
            $this->em->persist($user);
            $this->em->flush();

            $output->writeln(sprintf('<info>Admin created:</info> %s', $email));
            return Command::SUCCESS;
        }

        $changed = false;

        if ($promoteExisting && !in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            $roles = $user->getRoles();
            $roles[] = 'ROLE_ADMIN';
            $user->setRoles(array_values(array_unique($roles)));
            $changed = true;
        }

        if ($setPassword) {
            if (!is_string($password) || $password === '') {
                $output->writeln('<error>Password is required when using --set-password.</error>');
                return Command::INVALID;
            }

            $user->setPassword($this->passwordHasher->hashPassword($user, $password));
            $changed = true;
        }

        if ($changed) {
            $this->em->flush();
            $output->writeln(sprintf('<info>Admin updated:</info> %s', $email));
            return Command::SUCCESS;
        }

        $output->writeln(sprintf('<comment>No changes.</comment> %s already exists.', $email));
        return Command::SUCCESS;
    }
}

