<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProviderInterface;
use Symfony\Bundle\SecurityBundle\Security;
use App\Entity\User;

/** @implements ProviderInterface<User> */
class MeStateProvider implements ProviderInterface
{
    public function __construct(
        private Security $security
    ) {}

    public function provide(Operation $operation, array $uriVariables = [], array $context = []): User
    {
        $user = $this->security->getUser();

        if (!$user instanceof User) {
            throw new \RuntimeException('Authenticated user is required.');
        }

        return $user;
    }
}
