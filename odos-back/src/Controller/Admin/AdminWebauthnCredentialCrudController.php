<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\AdminWebauthnCredential;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;

/**
 * @extends AbstractCrudController<AdminWebauthnCredential>
 */
class AdminWebauthnCredentialCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return AdminWebauthnCredential::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInPlural('Clés WebAuthn (admin)')
            ->setEntityLabelInSingular('Clé')
            ->setDefaultSort(['createdAt' => 'DESC']);
    }

    public function configureActions(Actions $actions): Actions
    {
        return $actions
            ->disable(Action::NEW, Action::EDIT);
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->hideOnForm(),
            AssociationField::new('user', 'Admin'),
            TextField::new('credentialId', 'ID credential')
                ->formatValue(function (?string $value): string {
                    if (null === $value || '' === $value) {
                        return '';
                    }

                    return \strlen($value) > 28 ? substr($value, 0, 28).'…' : $value;
                }),
            DateTimeField::new('createdAt', 'Créée le'),
            TextareaField::new('credentialSource', 'Source (JSON)')
                ->hideOnIndex()
                ->onlyOnDetail(),
        ];
    }
}
