<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\AdminAuditLog;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Filter\ChoiceFilter;
use EasyCorp\Bundle\EasyAdminBundle\Filter\TextFilter;

/**
 * @extends AbstractCrudController<AdminAuditLog>
 */
class AdminAuditLogCrudController extends AbstractCrudController
{
    public static function getEntityFqcn(): string
    {
        return AdminAuditLog::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInPlural('Logs admin')
            ->setEntityLabelInSingular('Log admin')
            ->setDefaultSort(['createdAt' => 'DESC']);
    }

    public function configureActions(Actions $actions): Actions
    {
        return $actions
            ->disable(Action::NEW, Action::EDIT)
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->update(Crud::PAGE_INDEX, Action::DETAIL, static function (Action $action): Action {
                return $action
                    ->setLabel('Détails JSON')
                    ->setIcon('fa fa-code');
            });
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add(TextFilter::new('adminEmail', 'Admin'))
            ->add(TextFilter::new('entityClass', 'Entité'))
            ->add(ChoiceFilter::new('action')->setChoices([
                'CREATE' => 'CREATE',
                'UPDATE' => 'UPDATE',
                'DELETE' => 'DELETE',
            ]))
            ->add(ChoiceFilter::new('level')->setChoices([
                'info' => 'info',
                'warning' => 'warning',
            ]));
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->hideOnForm(),
            DateTimeField::new('createdAt', 'Horodatage'),
            TextField::new('adminEmail', 'Admin'),
            TextField::new('action', 'Action'),
            TextField::new('entityClass', 'Entité'),
            TextField::new('entityId', 'Entity ID')->setRequired(false),
            TextField::new('level', 'Niveau'),
            TextField::new('summary', 'Résumé'),
            TextareaField::new('contextPrettyJson', 'Contexte (JSON)')
                ->onlyOnDetail()
                ->setFormTypeOption('attr', [
                    'rows' => 16,
                    'style' => 'font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;',
                ]),
        ];
    }
}
