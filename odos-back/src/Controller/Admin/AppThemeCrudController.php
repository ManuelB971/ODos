<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\AppTheme;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CodeEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

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

    public function configureActions(Actions $actions): Actions
    {
        return $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL);
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnIndex();

        // Le slug est la clé de jointure avec la palette mobile et la préférence
        // stockée côté utilisateur : on l'interdit en édition pour ne pas orpheliner
        // les choix de thème existants (modifiable uniquement à la création).
        $slug = TextField::new('slug')
            ->setHelp('Identifiant court en minuscules (ex : ocean). Sert de clé : non modifiable après création.');
        if (Crud::PAGE_EDIT === $pageName) {
            $slug->setFormTypeOption('disabled', true);
        }
        yield $slug;

        yield TextField::new('label')
            ->setHelp('Nom affiché dans le picker utilisateur (ex : Côte Atlantique).');
        yield TextField::new('description')
            ->setRequired(false)
            ->setHelp('Description courte optionnelle, visible sous le nom du thème.');
        yield BooleanField::new('isActive', 'Actif')
            ->setHelp('Seuls les thèmes actifs sont proposés aux utilisateurs.');
        yield IntegerField::new('sortOrder', 'Ordre')
            ->setHelp('Ordre d\'affichage dans le picker (croissant).');

        // CodeEditorField est un champ texte : on le mappe sur les accesseurs JSON
        // virtuels de l'entité (string ⇄ array), pas sur les colonnes `json` brutes.
        // 'json' n'est pas un langage EasyAdmin valide → 'js' (sur-ensemble) pour le highlight.
        yield CodeEditorField::new('lightPaletteJson', 'Palette light (JSON)')
            ->setLanguage('js')
            ->setRequired(false)
            ->hideOnIndex()
            ->setHelp('Palette light complète au format JSON (optionnel — fallback sur la palette bundlée si vide). Toutes les clés ODOS sont requises si renseignée.');
        yield CodeEditorField::new('darkPaletteJson', 'Palette dark (JSON)')
            ->setLanguage('js')
            ->setRequired(false)
            ->hideOnIndex()
            ->setHelp('Palette dark complète au format JSON (optionnel — fallback sur la palette bundlée si vide). Toutes les clés ODOS sont requises si renseignée.');
    }
}
