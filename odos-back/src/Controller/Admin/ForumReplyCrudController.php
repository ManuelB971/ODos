<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\ForumReply;
use App\Service\ForumModerationService;
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
use EasyCorp\Bundle\EasyAdminBundle\Filter\EntityFilter;

/** @extends AbstractCrudController<ForumReply> */
class ForumReplyCrudController extends AbstractCrudController
{
    public function __construct(
        private readonly ForumModerationService $moderationService,
    ) {
    }

    public static function getEntityFqcn(): string
    {
        return ForumReply::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Réponse forum')
            ->setEntityLabelInPlural('Réponses forum')
            ->setDefaultSort(['createdAt' => 'DESC']);
    }

    public function configureActions(Actions $actions): Actions
    {
        return $actions
            ->disable(Action::NEW)
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->add(Crud::PAGE_INDEX, Action::new('hide', 'Masquer')->linkToCrudAction('hideReply'))
            ->add(Crud::PAGE_DETAIL, Action::new('hide', 'Masquer')->linkToCrudAction('hideReply'));
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters->add(EntityFilter::new('thread'));
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnIndex();
        yield TextareaField::new('content')
            ->hideOnIndex()
            ->setNumOfRows(6);
        yield AssociationField::new('author');
        yield AssociationField::new('thread');
        yield BooleanField::new('isHidden');
        yield IntegerField::new('likeCount')->onlyOnIndex();
        yield DateTimeField::new('createdAt');
    }

    public function hideReply(): \Symfony\Component\HttpFoundation\RedirectResponse
    {
        $reply = $this->getContext()?->getEntity()->getInstance();
        if ($reply instanceof ForumReply) {
            $this->moderationService->hideReply($reply);
        }

        return $this->redirect($this->generateUrl('admin'));
    }
}
