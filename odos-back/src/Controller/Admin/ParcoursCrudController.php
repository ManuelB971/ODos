<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Parcours;
use App\Enum\ParcoursVisibility;
use App\Service\AdminAuditLogger;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\UrlField;
use EasyCorp\Bundle\EasyAdminBundle\Filter\ChoiceFilter;
use EasyCorp\Bundle\EasyAdminBundle\Filter\EntityFilter;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\HttpFoundation\RedirectResponse;

/**
 * Modération des parcours (itinéraires générés par les utilisateurs).
 *
 * - Liste, filtre et inspecte les parcours.
 * - Action « Rendre privé » pour dépublier un parcours abusif sans le détruire.
 * - Suppression définitive possible, tracée dans l'audit log.
 *
 * Pas de création : les parcours sont produits par les utilisateurs.
 *
 * @extends AbstractCrudController<Parcours>
 */
class ParcoursCrudController extends AbstractCrudController
{
    private const ACTION_MAKE_PRIVATE = 'makeParcoursPrivate';

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly AdminAuditLogger $auditLogger,
        private readonly AdminUrlGenerator $adminUrlGenerator,
    ) {
    }

    public static function getEntityFqcn(): string
    {
        return Parcours::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Parcours')
            ->setEntityLabelInPlural('Parcours')
            ->setSearchFields(['title', 'description', 'owner.email'])
            ->setDefaultSort(['createdAt' => 'DESC'])
            ->setPaginatorPageSize(25);
    }

    public function configureActions(Actions $actions): Actions
    {
        $makePrivate = Action::new(self::ACTION_MAKE_PRIVATE, 'Rendre privé', 'fa fa-eye-slash')
            ->linkToCrudAction('makePrivate')
            ->displayIf(static fn (Parcours $p): bool => ParcoursVisibility::Public === $p->getVisibility())
            ->addCssClass('text-warning');

        return $actions
            ->disable(Action::NEW)
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->add(Crud::PAGE_INDEX, $makePrivate)
            ->add(Crud::PAGE_DETAIL, $makePrivate);
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add(ChoiceFilter::new('visibility', 'Visibilité')->setChoices([
                'Public' => ParcoursVisibility::Public,
                'Privé' => ParcoursVisibility::Private,
            ]))
            ->add(EntityFilter::new('owner', 'Propriétaire'));
    }

    public function configureFields(string $pageName): iterable
    {
        $isEditPage = Crud::PAGE_EDIT === $pageName;

        yield IdField::new('id')->onlyOnIndex();
        yield AssociationField::new('owner', 'Propriétaire')->setDisabled($isEditPage);

        $titleField = TextField::new('title', 'Titre');
        if (Crud::PAGE_INDEX === $pageName) {
            $titleField->setMaxLength(60);
        }
        yield $titleField;

        yield TextareaField::new('description', 'Description')
            ->setRequired(false)
            ->hideOnIndex();
        yield UrlField::new('coverImageUrl', 'Pochette')
            ->setRequired(false)
            ->hideOnForm();

        yield ChoiceField::new('visibility', 'Visibilité')
            ->setChoices([
                'Public' => ParcoursVisibility::Public,
                'Privé' => ParcoursVisibility::Private,
            ]);

        yield IntegerField::new('itemCount', 'Étapes')->setDisabled($isEditPage);
        yield DateTimeField::new('createdAt', 'Créé le')->setDisabled($isEditPage);
        yield DateTimeField::new('updatedAt', 'Maj le')->onlyOnDetail();
    }

    public function updateEntity(EntityManagerInterface $entityManager, $entityInstance): void
    {
        if ($entityInstance instanceof Parcours) {
            $entityInstance->touch();
            $this->auditLogger->log(
                action: 'UPDATE',
                entityClass: Parcours::class,
                entityId: (string) $entityInstance->getId(),
                summary: sprintf(
                    'Édition parcours #%d (visibilité=%s)',
                    (int) $entityInstance->getId(),
                    $entityInstance->getVisibility()->value,
                ),
                level: 'info',
            );
        }

        parent::updateEntity($entityManager, $entityInstance);
    }

    public function deleteEntity(EntityManagerInterface $entityManager, $entityInstance): void
    {
        if ($entityInstance instanceof Parcours) {
            $this->auditLogger->log(
                action: 'DELETE',
                entityClass: Parcours::class,
                entityId: (string) $entityInstance->getId(),
                summary: sprintf(
                    'Suppression définitive du parcours #%d ("%s", propriétaire=%s)',
                    (int) $entityInstance->getId(),
                    $entityInstance->getTitle(),
                    $entityInstance->getOwner()?->getUserIdentifier() ?? 'n/a',
                ),
                level: 'warning',
            );
        }

        parent::deleteEntity($entityManager, $entityInstance);
    }

    /**
     * @param AdminContext<Parcours> $context
     */
    public function makePrivate(AdminContext $context): RedirectResponse
    {
        $parcours = $context->getEntity()->getInstance();
        if (!$parcours instanceof Parcours) {
            $this->addFlash('danger', 'Parcours introuvable.');

            return $this->redirect($this->adminUrlGenerator
                ->setController(self::class)
                ->setAction(Action::INDEX)
                ->generateUrl());
        }

        $parcours->setVisibility(ParcoursVisibility::Private)->touch();
        $this->entityManager->flush();

        $this->auditLogger->log(
            action: 'UNPUBLISH',
            entityClass: Parcours::class,
            entityId: (string) $parcours->getId(),
            summary: sprintf(
                'Dépublication parcours #%d ("%s", propriétaire=%s)',
                (int) $parcours->getId(),
                $parcours->getTitle(),
                $parcours->getOwner()?->getUserIdentifier() ?? 'n/a',
            ),
            level: 'warning',
        );

        $this->addFlash('warning', sprintf('Parcours #%d rendu privé.', (int) $parcours->getId()));

        $referrer = $context->getReferrer();
        $url = $referrer ?: $this->adminUrlGenerator
            ->setController(self::class)
            ->setAction(Action::INDEX)
            ->generateUrl();

        return $this->redirect($url);
    }
}
