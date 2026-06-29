<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\ForumThread;
use App\Service\ForumModerationService;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Filter\EntityFilter;

/** @extends AbstractCrudController<ForumThread> */
class ForumThreadCrudController extends AbstractCrudController
{
    public function __construct(
        private readonly ForumModerationService $moderationService,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public static function getEntityFqcn(): string
    {
        return ForumThread::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Fil forum')
            ->setEntityLabelInPlural('Fils forum')
            ->setDefaultSort(['createdAt' => 'DESC'])
            ->setPaginatorPageSize(30);
    }

    public function configureActions(Actions $actions): Actions
    {
        return $actions
            ->disable(Action::NEW)
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->add(Crud::PAGE_INDEX, Action::new('lock', 'Verrouiller')->linkToCrudAction('lockThread'))
            ->add(Crud::PAGE_INDEX, Action::new('unlock', 'Déverrouiller')->linkToCrudAction('unlockThread'))
            ->add(Crud::PAGE_DETAIL, Action::new('lock', 'Verrouiller')->linkToCrudAction('lockThread'))
            ->add(Crud::PAGE_DETAIL, Action::new('unlock', 'Déverrouiller')->linkToCrudAction('unlockThread'));
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add(EntityFilter::new('author'))
            ->add(EntityFilter::new('activity'))
            ->add(EntityFilter::new('group'));
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnIndex();
        yield TextField::new('title');
        yield TextareaField::new('content')
            ->hideOnIndex()
            ->setNumOfRows(8);
        yield AssociationField::new('author');
        yield AssociationField::new('activity');
        yield AssociationField::new('category');
        yield AssociationField::new('group');
        yield BooleanField::new('isPinned');
        yield BooleanField::new('isLocked');
        yield IntegerField::new('replyCount')->onlyOnIndex();
        yield DateTimeField::new('lastReplyAt');
        yield DateTimeField::new('createdAt');
    }

    public function lockThread(): \Symfony\Component\HttpFoundation\RedirectResponse
    {
        $thread = $this->getContext()?->getEntity()->getInstance();
        if ($thread instanceof ForumThread) {
            $this->moderationService->lockThread($thread);
        }

        return $this->redirect($this->generateUrl('admin'));
    }

    public function unlockThread(): \Symfony\Component\HttpFoundation\RedirectResponse
    {
        $thread = $this->getContext()?->getEntity()->getInstance();
        if ($thread instanceof ForumThread) {
            $thread->setIsLocked(false);
            $this->em->flush();
        }

        return $this->redirect($this->generateUrl('admin'));
    }
}
