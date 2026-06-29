<?php

declare(strict_types=1);

namespace App\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\CallbackTransformer;
use Symfony\Component\Form\Exception\TransformationFailedException;
use Symfony\Component\Form\Extension\Core\Type\TextareaType;
use Symfony\Component\Form\FormBuilderInterface;

/**
 * Sérialise un tableau PHP en JSON éditable dans un textarea (admin badges, etc.).
 */
final class JsonArrayType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder->addModelTransformer(new CallbackTransformer(
            static function (?array $value): string {
                if (null === $value || [] === $value) {
                    return '';
                }

                try {
                    return json_encode($value, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
                } catch (\JsonException $e) {
                    throw new TransformationFailedException(
                        'Impossible de sérialiser la configuration JSON en base.',
                        $e->getCode(),
                        $e,
                    );
                }
            },
            static function (?string $value): ?array {
                if (null === $value || '' === trim($value)) {
                    return null;
                }

                try {
                    $decoded = json_decode($value, true, 512, JSON_THROW_ON_ERROR);
                } catch (\JsonException) {
                    throw new TransformationFailedException('JSON invalide — vérifiez les accolades et guillemets.');
                }

                if (!is_array($decoded)) {
                    throw new TransformationFailedException('La config doit être un objet JSON (ex. {"threshold": 5}).');
                }

                return $decoded;
            },
        ));
    }

    public function getParent(): string
    {
        return TextareaType::class;
    }
}
