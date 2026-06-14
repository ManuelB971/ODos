<?php

declare(strict_types=1);

namespace App\State;

use ApiPlatform\Metadata\Operation;
use ApiPlatform\Metadata\Post;
use ApiPlatform\State\ProcessorInterface;
use App\Entity\User;
use App\Service\AliasGenerator;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;

/**
 * Vérifie le consentement explicite à l'inscription (art. 7 RGPD).
 *
 * @implements ProcessorInterface<mixed, mixed>
 */
final class UserRegistrationProcessor implements ProcessorInterface
{
    public function __construct(
        /** @var ProcessorInterface<mixed, mixed> */
        private readonly ProcessorInterface $innerProcessor,
        private readonly RequestStack $requestStack,
        private readonly AliasGenerator $aliasGenerator,
    ) {
    }

    public function process(mixed $data, Operation $operation, array $uriVariables = [], array $context = []): mixed
    {
        if ($data instanceof User && $operation instanceof Post) {
            $request = $this->requestStack->getCurrentRequest();
            $payload = $request?->toArray() ?? [];
            $accepted = filter_var($payload['acceptTerms'] ?? false, FILTER_VALIDATE_BOOL);

            if (!$accepted) {
                throw new BadRequestHttpException(
                    'Vous devez accepter les conditions générales et la politique de confidentialité.'
                );
            }

            $data->setConsentedAt(new \DateTimeImmutable());

            // Attribue un alias public par défaut (dérivé de l'e-mail) pour que
            // le compte soit trouvable dans la recherche d'amis dès l'inscription.
            $email = $data->getEmail();
            if (null === $data->getAlias() && null !== $email && '' !== $email) {
                $data->setAlias($this->aliasGenerator->fromEmail($email));
            }
        }

        return $this->innerProcessor->process($data, $operation, $uriVariables, $context);
    }
}
