<?php

namespace App\Controller\Admin;

use App\Entity\Activity;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Filter\BooleanFilter;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\MoneyField;
use EasyCorp\Bundle\EasyAdminBundle\Field\NumberField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\UrlField;

class ActivityCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return Activity::class;
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add(BooleanFilter::new('isPublished', 'Publiée'));
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->hideOnForm(),
            TextField::new('name', 'Nom'),
            TextEditorField::new('description'),
            TextField::new('city', 'Ville'),
            NumberField::new('latitude')->setNumDecimals(6),
            NumberField::new('longitude')->setNumDecimals(6),
            AssociationField::new('category', 'Catégorie'),
            MoneyField::new('price', 'Prix')->setCurrency('EUR')->setStoredAsCents(false)->setRequired(false),
            UrlField::new('imageUrl', 'Image (URL)')->setRequired(false),
            DateTimeField::new('dateStart', 'Date de début')->setRequired(false),
            DateTimeField::new('dateEnd', 'Date de fin')->setRequired(false),
            BooleanField::new('isPublished', 'Publiée')
                ->setHelp('Si désactivé, l’activité est masquée pour les utilisateurs (API) sauf administrateurs.'),
            AssociationField::new('favoritedBy', 'Favoris (utilisateurs)')
                ->onlyOnDetail()
                ->setHelp('Lecture seule : utilisateurs ayant mis cette activité en favori.'),
        ];
    }
}
