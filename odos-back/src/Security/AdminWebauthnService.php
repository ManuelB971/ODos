<?php

namespace App\Security;

use App\Entity\AdminWebauthnCredential;
use App\Entity\User;
use App\Repository\AdminWebauthnCredentialRepository;
use Doctrine\ORM\EntityManagerInterface;
use ParagonIE\ConstantTime\Base64UrlSafe;
use Webauthn\AttestationStatement\AttestationStatementSupportManager;
use Webauthn\AuthenticatorAssertionResponse;
use Webauthn\AuthenticatorAssertionResponseValidator;
use Webauthn\AuthenticatorAttestationResponse;
use Webauthn\AuthenticatorAttestationResponseValidator;
use Webauthn\AuthenticatorSelectionCriteria;
use Webauthn\Denormalizer\WebauthnSerializerFactory;
use Webauthn\PublicKeyCredential;
use Webauthn\PublicKeyCredentialCreationOptions;
use Webauthn\PublicKeyCredentialDescriptor;
use Webauthn\PublicKeyCredentialParameters;
use Webauthn\PublicKeyCredentialRequestOptions;
use Webauthn\PublicKeyCredentialRpEntity;
use Webauthn\PublicKeyCredentialSource;
use Webauthn\PublicKeyCredentialUserEntity;

class AdminWebauthnService
{
    public function __construct(
        private readonly AdminWebauthnCredentialRepository $credentialRepository,
        private readonly EntityManagerInterface $entityManager,
    ) {
    }

    public function hasCredential(User $user): bool
    {
        return $this->credentialRepository->countByUser($user) > 0;
    }

    public function buildRegistrationOptions(User $user, string $rpId): PublicKeyCredentialCreationOptions
    {
        $rpId = $this->resolveRpId($rpId);

        $userEntity = PublicKeyCredentialUserEntity::create(
            (string) $user->getEmail(),
            (string) $user->getId(),
            (string) $user->getEmail()
        );

        $excludeCredentials = [];
        foreach ($this->credentialRepository->findByUser($user) as $credential) {
            $excludeCredentials[] = PublicKeyCredentialDescriptor::create(
                PublicKeyCredentialDescriptor::CREDENTIAL_TYPE_PUBLIC_KEY,
                Base64UrlSafe::decodeNoPadding((string) $credential->getCredentialId())
            );
        }

        return PublicKeyCredentialCreationOptions::create(
            PublicKeyCredentialRpEntity::create('ODos Admin', $rpId),
            $userEntity,
            random_bytes(32),
            [
                PublicKeyCredentialParameters::createPk(-7),
                PublicKeyCredentialParameters::createPk(-257),
            ],
            AuthenticatorSelectionCriteria::create(
                AuthenticatorSelectionCriteria::AUTHENTICATOR_ATTACHMENT_PLATFORM,
                AuthenticatorSelectionCriteria::USER_VERIFICATION_REQUIREMENT_REQUIRED
            ),
            PublicKeyCredentialCreationOptions::ATTESTATION_CONVEYANCE_PREFERENCE_NONE,
            $excludeCredentials,
            60000
        );
    }

    public function completeRegistration(User $user, string $credentialJson, string $optionsJson, string $host): void
    {
        $host = $this->resolveRpId($host);

        $serializer = $this->createSerializer();

        /** @var PublicKeyCredentialCreationOptions $options */
        $options = $serializer->deserialize($optionsJson, PublicKeyCredentialCreationOptions::class, 'json');
        /** @var PublicKeyCredential $publicKeyCredential */
        $publicKeyCredential = $serializer->deserialize($credentialJson, PublicKeyCredential::class, 'json');

        if (!$publicKeyCredential->response instanceof AuthenticatorAttestationResponse) {
            throw new \RuntimeException('Reponse WebAuthn invalide (attestation attendue).');
        }

        $validator = new AuthenticatorAttestationResponseValidator(
            AttestationStatementSupportManager::create()
        );

        $source = $validator->check($publicKeyCredential->response, $options, $host);
        $credentialId = Base64UrlSafe::encodeUnpadded($source->publicKeyCredentialId);

        $record = $this->credentialRepository->findOneBy(['credentialId' => $credentialId]);
        if (!$record instanceof AdminWebauthnCredential) {
            $record = new AdminWebauthnCredential();
            $record->setUser($user);
            $record->setCredentialId($credentialId);
        }

        $record->setCredentialSource(json_encode($source, JSON_THROW_ON_ERROR));
        $this->credentialRepository->save($record, true);
    }

    public function buildAuthenticationOptions(User $user, string $rpId): PublicKeyCredentialRequestOptions
    {
        $rpId = $this->resolveRpId($rpId);

        $allowCredentials = [];
        foreach ($this->credentialRepository->findByUser($user) as $credential) {
            $allowCredentials[] = PublicKeyCredentialDescriptor::create(
                PublicKeyCredentialDescriptor::CREDENTIAL_TYPE_PUBLIC_KEY,
                Base64UrlSafe::decodeNoPadding((string) $credential->getCredentialId())
            );
        }

        if ($allowCredentials === []) {
            throw new \RuntimeException('Aucune cle biometrie enregistree pour cet admin.');
        }

        return PublicKeyCredentialRequestOptions::create(
            random_bytes(32),
            $rpId,
            $allowCredentials,
            PublicKeyCredentialRequestOptions::USER_VERIFICATION_REQUIREMENT_REQUIRED,
            60000
        );
    }

    public function completeAuthentication(User $user, string $credentialJson, string $optionsJson, string $host): void
    {
        $host = $this->resolveRpId($host);

        $serializer = $this->createSerializer();

        /** @var PublicKeyCredentialRequestOptions $options */
        $options = $serializer->deserialize($optionsJson, PublicKeyCredentialRequestOptions::class, 'json');
        /** @var PublicKeyCredential $publicKeyCredential */
        $publicKeyCredential = $serializer->deserialize($credentialJson, PublicKeyCredential::class, 'json');

        if (!$publicKeyCredential->response instanceof AuthenticatorAssertionResponse) {
            throw new \RuntimeException('Reponse WebAuthn invalide (assertion attendue).');
        }

        $credentialId = Base64UrlSafe::encodeUnpadded($publicKeyCredential->rawId);
        $record = $this->credentialRepository->findOneBy(['credentialId' => $credentialId]);
        if (!$record instanceof AdminWebauthnCredential) {
            throw new \RuntimeException('Cle biometrie inconnue.');
        }

        /** @var PublicKeyCredentialSource $source */
        $source = $serializer->deserialize((string) $record->getCredentialSource(), PublicKeyCredentialSource::class, 'json');

        $validator = new AuthenticatorAssertionResponseValidator();
        $updatedSource = $validator->check(
            $source,
            $publicKeyCredential->response,
            $options,
            $host,
            (string) $user->getId()
        );

        $record->setCredentialSource(json_encode($updatedSource, JSON_THROW_ON_ERROR));
        $this->entityManager->flush();
    }

    private function createSerializer(): \Symfony\Component\Serializer\SerializerInterface
    {
        return (new WebauthnSerializerFactory(AttestationStatementSupportManager::create()))->create();
    }

    private function resolveRpId(string $host): string
    {
        $configured = $_ENV['ADMIN_WEBAUTHN_RP_ID'] ?? getenv('ADMIN_WEBAUTHN_RP_ID') ?: '';

        return trim((string) $configured) !== '' ? trim((string) $configured) : $host;
    }
}
