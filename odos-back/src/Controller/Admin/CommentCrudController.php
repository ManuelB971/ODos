<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\Comment;
use App\Service\AdminAuditLogger;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Context\AdminContext;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Filter\BooleanFilter;
use EasyCorp\Bundle\EasyAdminBundle\Filter\EntityFilter;
use EasyCorp\Bundle\EasyAdminBundle\Filter\TextFilter;
use EasyCorp\Bundle\EasyAdminBundle\Router\AdminUrlGenerator;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Response;

/**
 * Modération des commentaires depuis EasyAdmin.
 *
 * - Liste, filtre et inspecte les commentaires utilisateurs.
 * - Permet de basculer le drapeau {@see Comment::isHidden} (soft-delete réversible)
 *   sans jamais supprimer le contenu en base.
 * - Trace chaque action de modération dans l'audit log admin.
 */
class CommentCrudController extends AbstractCrudController
{
    private const ACTION_HIDE = 'hideComment';
    private const ACTION_UNHIDE = 'unhideComment';

    public function __construct(
        private readonly EntityManagerInterface $entityManager,
        private readonly AdminAuditLogger $auditLogger,
        private readonly AdminUrlGenerator $adminUrlGenerator,
    ) {
    }

    public static function getEntityFqcn(): string
    {
        return Comment::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Commentaire')
            ->setEntityLabelInPlural('Commentaires')
            ->setSearchFields(['content', 'author.email', 'activity.name'])
            ->setDefaultSort(['createdAt' => 'DESC'])
            ->setPaginatorPageSize(25);
    }

    public function configureActions(Actions $actions): Actions
    {
        $hideAction = Action::new(self::ACTION_HIDE, 'Masquer', 'fa fa-eye-slash')
            ->linkToCrudAction('hide')
            ->displayIf(static fn (Comment $c): bool => !$c->isHidden())
            ->addCssClass('text-warning');

        $unhideAction = Action::new(self::ACTION_UNHIDE, 'Réafficher', 'fa fa-eye')
            ->linkToCrudAction('unhide')
            ->displayIf(static fn (Comment $c): bool => $c->isHidden())
            ->addCssClass('text-success');

        return $actions
            ->disable(Action::NEW)
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->add(Crud::PAGE_INDEX, $hideAction)
            ->add(Crud::PAGE_INDEX, $unhideAction)
            ->add(Crud::PAGE_DETAIL, $hideAction)
            ->add(Crud::PAGE_DETAIL, $unhideAction);
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add(BooleanFilter::new('isHidden', 'Masqué'))
            ->add(BooleanFilter::new('isEdited', 'Édité'))
            ->add(TextFilter::new('content', 'Contenu'))
            ->add(EntityFilter::new('author', 'Auteur'))
            ->add(EntityFilter::new('activity', 'Activité'));
    }

    public function configureFields(string $pageName): iterable
    {
        $isEditPage = Crud::PAGE_EDIT === $pageName;

        yield IdField::new('id')->onlyOnIndex();
        yield DateTimeField::new('createdAt', 'Créé le')->setDisabled($isEditPage);
        yield AssociationField::new('author', 'Auteur')->setDisabled($isEditPage);
        yield AssociationField::new('activity', 'Activité')->setDisabled($isEditPage);

        $contentField = TextareaField::new('content', 'Contenu')->setDisabled($isEditPage);
        if (Crud::PAGE_INDEX === $pageName) {
            $contentField->setMaxLength(80);
        }
        yield $contentField;

        yield BooleanField::new('isEdited', 'Édité')
            ->renderAsSwitch(false)
            ->setDisabled($isEditPage);

        $isHiddenField = BooleanField::new('isHidden', 'Masqué')
            ->renderAsSwitch($isEditPage);
        if ($isEditPage) {
            $isHiddenField->setHelp('Activé : invisible des utilisateurs (soft-delete).');
        }
        yield $isHiddenField;

        yield DateTimeField::new('updatedAt', 'Dernière maj')
            ->onlyOnDetail();
    }

    public function hide(AdminContext $context): Response
    {
        return $this->toggleHidden($context, true);
    }

    public function unhide(AdminContext $context): Response
    {
        return $this->toggleHidden($context, false);
    }

    public function updateEntity($entityManager, $entityInstance): void
    {
        if ($entityInstance instanceof Comment) {
            $entityInstance->setUpdatedAt(new \DateTimeImmutable());
            $this->auditLogger->log(
                action: 'UPDATE',
                entityClass: Comment::class,
                entityId: (string) $entityInstance->getId(),
                summary: sprintf(
                    'Modification commentaire #%d (masqué=%s)',
                    (int) $entityInstance->getId(),
                    $entityInstance->isHidden() ? 'oui' : 'non'
                ),
                level: 'info',
            );
        }

        parent::updateEntity($entityManager, $entityInstance);
    }

    public function deleteEntity($entityManager, $entityInstance): void
    {
        if ($entityInstance instanceof Comment) {
            $this->auditLogger->log(
                action: 'DELETE',
                entityClass: Comment::class,
                entityId: (string) $entityInstance->getId(),
                summary: sprintf('Suppression définitive du commentaire #%d', (int) $entityInstance->getId()),
                level: 'warning',
            );
        }

        parent::deleteEntity($entityManager, $entityInstance);
    }

    private function toggleHidden(AdminContext $context, bool $hidden): RedirectResponse
    {
        $comment = $context->getEntity()->getInstance();
        if (!$comment instanceof Comment) {
            $this->addFlash('danger', 'Commentaire introuvable.');

            return $this->redirect($this->adminUrlGenerator
                ->setController(self::class)
                ->setAction(Action::INDEX)
                ->generateUrl());
        }

        $comment->setIsHidden($hidden);
        $comment->setUpdatedAt(new \DateTimeImmutable());
        $this->entityManager->flush();

        $this->auditLogger->log(
            action: $hidden ? 'HIDE' : 'UNHIDE',
            entityClass: Comment::class,
            entityId: (string) $comment->getId(),
            summary: sprintf(
                '%s commentaire #%d (auteur=%s, activité=%s)',
                $hidden ? 'Masquage' : 'Réaffichage',
                (int) $comment->getId(),
                $comment->getAuthor()?->getUserIdentifier() ?? 'n/a',
                $comment->getActivity()?->getName() ?? 'n/a',
            ),
            level: $hidden ? 'warning' : 'info',
        );

        $this->addFlash(
            $hidden ? 'warning' : 'success',
            $hidden
                ? sprintf('Commentaire #%d masqué (invisible pour les utilisateurs).', (int) $comment->getId())
                : sprintf('Commentaire #%d à nouveau visible.', (int) $comment->getId())
        );

        $referrer = $context->getReferrer();
        $url = $referrer ?: $this->adminUrlGenerator
            ->setController(self::class)
            ->setAction(Action::INDEX)
            ->generateUrl();

        return $this->redirect($url);
    }
}
