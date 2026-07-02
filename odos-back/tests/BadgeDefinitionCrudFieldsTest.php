<?php

declare(strict_types=1);

namespace App\Tests;

use App\Controller\Admin\BadgeDefinitionCrudController;
use App\Entity\BadgeDefinition;
use App\Enum\BadgeRuleType;
use App\Form\Type\JsonArrayType;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Form\Exception\TransformationFailedException;
use Symfony\Component\Form\Forms;

/**
 * Régression : champs du formulaire d'édition badge (ex. /admin/badge-definition/2/edit).
 */
final class BadgeDefinitionCrudFieldsTest extends TestCase
{
    public function testConfigureFieldsEditPageHasNoDuplicatePropertyNames(): void
    {
        $controller = $this->newBadgeCrudController();
        $propertyNames = [];

        foreach ($controller->configureFields(Crud::PAGE_EDIT) as $field) {
            $dto = $field->getAsDto();
            if (!$dto->isDisplayedOn(Crud::PAGE_EDIT)) {
                continue;
            }
            $propertyNames[] = $dto->getProperty();
        }

        self::assertSame($propertyNames, array_unique($propertyNames));
        self::assertNotContains('ruleConfigDisplay', $propertyNames);
    }

    public function testJsonArrayTypeRoundTripsFiveFavoritesSeedConfig(): void
    {
        $factory = Forms::createFormFactoryBuilder()
            ->addType(new JsonArrayType())
            ->getFormFactory();

        $form = $factory->create(JsonArrayType::class);
        $config = ['threshold' => 5];

        $form->setData($config);
        self::assertSame("{\n    \"threshold\": 5\n}", $form->getViewData());

        $form->submit("{\n  \"threshold\": 5\n}");
        self::assertTrue($form->isValid());
        self::assertSame($config, $form->getData());
    }

    public function testRuleTypeDetailPageUsesHumanReadableLabel(): void
    {
        $controller = $this->newBadgeCrudController();
        $formatValue = null;

        foreach ($controller->configureFields(Crud::PAGE_DETAIL) as $field) {
            $dto = $field->getAsDto();
            if ('ruleType' !== $dto->getProperty()) {
                continue;
            }
            $formatValue = $dto->getFormatValueCallable();
            break;
        }

        self::assertIsCallable($formatValue);
        self::assertSame(
            'Nombre de favoris',
            ($formatValue)(BadgeRuleType::FavoritesCount),
        );
    }

    public function testJsonArrayTypeSurfacesEncodingFailures(): void
    {
        $factory = Forms::createFormFactoryBuilder()
            ->addType(new JsonArrayType())
            ->getFormFactory();

        $form = $factory->create(JsonArrayType::class);

        $this->expectException(TransformationFailedException::class);
        $this->expectExceptionMessage('Impossible de sérialiser la configuration JSON en base.');

        $form->setData(['stream' => fopen('php://memory', 'r')]);
    }

    public function testRuleConfigDisplayMatchesSeedBadge(): void
    {
        $badge = new BadgeDefinition();
        $badge->setCode('five_favorites');
        $badge->setName('Collectionneur');
        $badge->setDescription('Cinq activités en favoris — tu sais ce qui te plaît.');
        $badge->setRuleType(BadgeRuleType::FavoritesCount);
        $badge->setRuleConfig(['threshold' => 5]);

        self::assertStringContainsString('"threshold": 5', $badge->getRuleConfigDisplay());
    }

    private function newBadgeCrudController(): BadgeDefinitionCrudController
    {
        $reflection = new \ReflectionClass(BadgeDefinitionCrudController::class);

        return $reflection->newInstanceWithoutConstructor();
    }
}
