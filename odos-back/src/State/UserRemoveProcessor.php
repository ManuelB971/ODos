<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Delete;
use ApiPlatform\Metadata\Operation;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\User;
use App\Service\UserDeletionService;

/**
 * @implements ProcessorInterface<mixed, mixed>
 */
final class UserRemoveProcessor implements ProcessorInterface
{
    public function __construct(
        /** @var ProcessorInterface<mixed, mixed> */
        private readonly ProcessorInterface $innerProcessor,
        private readonly UserDeletionService $userDeletionService,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof User && $operation instanceof Delete) {
            $this->userDeletionService->deleteUserAccount($data);

            return null;
        }

        return $this->innerProcessor->process($data, $operation, $uriVariables, $context);
    }
}
