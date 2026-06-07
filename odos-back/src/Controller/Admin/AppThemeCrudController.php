<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\AppTheme;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;

/** @extends AbstractCrudController<AppTheme> */
class AppThemeCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return AppTheme::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Thème')
            ->setEntityLabelInPlural('Thèmes')
            ->setDefaultSort(['sortOrder' => 'ASC', 'label' => 'ASC'])
            ->setHelp(
                'index',
                'Le slug doit correspondre à une palette bundlée dans l\'app mobile (ex : "default", "ocean", "forest"). '
                . 'Seuls les thèmes actifs sont envoyés aux utilisateurs via GET /api/themes.'
            );
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnIndex();
        yield TextField::new('slug')
            ->setHelp('Identifiant court en minuscules (ex : ocean). Doit exister dans l\'app.');
        yield TextField::new('label')
            ->setHelp('Nom affiché dans le picker utilisateur (ex : Côte Atlantique).');
        yield TextField::new('description')
            ->setRequired(false)
            ->setHelp('Description courte optionnelle, visible sous le nom du thème.');
        yield BooleanField::new('isActive', 'Actif')
            ->setHelp('Seuls les thèmes actifs sont proposés aux utilisateurs.');
        yield IntegerField::new('sortOrder', 'Ordre')
            ->setHelp('Ordre d\'affichage dans le picker (croissant).');
    }
}
