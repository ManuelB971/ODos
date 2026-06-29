<?php

declare(strict_types=1);

namespace App\Tests;

use App\Controller\Admin\ParcoursCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use PHPUnit\Framework\TestCase;

/**
 * Régression : aperçu pochette (ImageField) + saisie URL (UrlField) sur les parcours admin.
 */
final class ParcoursCrudFieldsTest extends TestCase
{
    public function testCoverImageUrlFieldRolesPerPage(): void
    {
        $controller = $this->newParcoursCrudController();

        $editProperties = $this->displayedProperties($controller, Crud::PAGE_EDIT);
        $detailProperties = $this->displayedProperties($controller, Crud::PAGE_DETAIL);

        self::assertContains('coverImageUrl', $editProperties, 'URL editable on edit form');
        self::assertContains('coverImageUrl', $detailProperties, 'Image preview on detail page');
        self::assertSame(['coverImageUrl'], array_values(array_filter(
            $editProperties,
            static fn (string $property): bool => 'coverImageUrl' === $property,
        )));
        self::assertSame(['coverImageUrl'], array_values(array_filter(
            $detailProperties,
            static fn (string $property): bool => 'coverImageUrl' === $property,
        )));
    }

    /**
     * @return list<string>
     */
    private function displayedProperties(ParcoursCrudController $controller, string $pageName): array
    {
        $propertyNames = [];

        foreach ($controller->configureFields($pageName) as $field) {
            $dto = $field->getAsDto();
            if (!$dto->isDisplayedOn($pageName)) {
                continue;
            }
            $propertyNames[] = $dto->getProperty();
        }

        return $propertyNames;
    }

    private function newParcoursCrudController(): ParcoursCrudController
    {
        $reflection = new \ReflectionClass(ParcoursCrudController::class);

        return $reflection->newInstanceWithoutConstructor();
    }
}
