<?php

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\User;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * @implements ProcessorInterface<mixed, mixed>
 */
class UserPasswordHasherProcessor implements ProcessorInterface
{
    public function __construct(
        /** @var ProcessorInterface<mixed, mixed> */
        private ProcessorInterface $innerProcessor,
        private UserPasswordHasherInterface $passwordHasher
    ) {}

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if (!$data instanceof User || !$data->getPlainPassword()) {
            return $this->innerProcessor->process($data, $operation, $uriVariables, $context);
        }

        $data->setPassword(
            $this->passwordHasher->hashPassword($data, $data->getPlainPassword())
        );
        $data->eraseCredentials();

        return $this->innerProcessor->process($data, $operation, $uriVariables, $context);
    }
}
