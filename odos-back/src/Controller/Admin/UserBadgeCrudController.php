<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\UserBadge;
use App\Service\AdminAuditLogger;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Filter\EntityFilter;

/**
 * Consultation et révocation des badges attribués aux utilisateurs.
 *
 * Comble l'asymétrie historique : l'attribution existait
 * ({@see BadgeManualAwardController}) mais aucun écran ne permettait de voir
 * qui possède quel badge, ni de le retirer. Pas de création/édition ici
 * (les badges se gagnent ou s'attribuent), uniquement lecture + révocation tracée.
 *
 * @extends AbstractCrudController<UserBadge>
 */
class UserBadgeCrudController extends AbstractCrudController
{
    public function __construct(
        private readonly AdminAuditLogger $auditLogger,
    ) {
    }

    public static function getEntityFqcn(): string
    {
        return UserBadge::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Badge attribué')
            ->setEntityLabelInPlural('Badges attribués')
            ->setSearchFields(['user.email', 'badge.name', 'badge.code'])
            ->setDefaultSort(['unlockedAt' => 'DESC'])
            ->setPaginatorPageSize(30);
    }

    public function configureActions(Actions $actions): Actions
    {
        // Attribution via BadgeDefinition → action « Attribuer » ; édition sans objet.
        return $actions
            ->disable(Action::NEW, Action::EDIT)
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->update(Crud::PAGE_INDEX, Action::DELETE, static fn (Action $a): Action => $a->setLabel('Révoquer')->setIcon('fa fa-trash'))
            ->update(Crud::PAGE_DETAIL, Action::DELETE, static fn (Action $a): Action => $a->setLabel('Révoquer')->setIcon('fa fa-trash'));
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add(EntityFilter::new('user', 'Utilisateur'))
            ->add(EntityFilter::new('badge', 'Badge'));
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnIndex();
        yield AssociationField::new('user', 'Utilisateur');
        yield AssociationField::new('badge', 'Badge');
        yield DateTimeField::new('unlockedAt', 'Débloqué le');
        yield DateTimeField::new('seenAt', 'Vu le')
            ->setHelp('Vide = badge pas encore vu par l\'utilisateur.');
    }

    public function deleteEntity(EntityManagerInterface $entityManager, $entityInstance): void
    {
        if ($entityInstance instanceof UserBadge) {
            $this->auditLogger->log(
                action: 'REVOKE',
                entityClass: UserBadge::class,
                entityId: (string) $entityInstance->getId(),
                summary: sprintf(
                    'Révocation du badge "%s" de %s',
                    $entityInstance->getBadge()?->getName() ?? 'n/a',
                    $entityInstance->getUser()?->getUserIdentifier() ?? 'n/a',
                ),
                level: 'warning',
            );
        }

        parent::deleteEntity($entityManager, $entityInstance);
    }
}
