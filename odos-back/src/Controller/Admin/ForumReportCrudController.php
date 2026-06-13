<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\ForumReport;
use App\Enum\ForumReportStatus;
use App\Service\ForumModerationService;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Filter\ChoiceFilter;

/** @extends AbstractCrudController<ForumReport> */
class ForumReportCrudController extends AbstractCrudController
{
    public function __construct(
        private readonly ForumModerationService $moderationService,
        private readonly EntityManagerInterface $em,
    ) {
    }

    public static function getEntityFqcn(): string
    {
        return ForumReport::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Signalement')
            ->setEntityLabelInPlural('Signalements forum')
            ->setDefaultSort(['createdAt' => 'DESC'])
            ->setPaginatorPageSize(30);
    }

    public function configureActions(Actions $actions): Actions
    {
        return $actions
            ->disable(Action::NEW, Action::DELETE)
            ->add(Crud::PAGE_INDEX, Action::new('hideReply', 'Masquer réponse')->linkToCrudAction('hideReply'))
            ->add(Crud::PAGE_INDEX, Action::new('lockThread', 'Verrouiller fil')->linkToCrudAction('lockThread'));
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters->add(ChoiceFilter::new('status')->setChoices([
            'En attente' => ForumReportStatus::Pending,
            'Traité' => ForumReportStatus::Reviewed,
            'Rejeté' => ForumReportStatus::Dismissed,
            'Action prise' => ForumReportStatus::ActionTaken,
        ]));
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnIndex();
        yield AssociationField::new('reporter');
        yield TextField::new('targetType');
        yield IntegerField::new('targetId');
        yield TextField::new('reason');
        yield TextareaField::new('details')->onlyOnDetail();
        yield ChoiceField::new('status')->setChoices([
            'En attente' => ForumReportStatus::Pending,
            'Traité' => ForumReportStatus::Reviewed,
            'Rejeté' => ForumReportStatus::Dismissed,
            'Action prise' => ForumReportStatus::ActionTaken,
        ]);
        yield AssociationField::new('thread')->onlyOnDetail();
        yield AssociationField::new('reply')->onlyOnDetail();
        yield DateTimeField::new('createdAt');
    }

    public function hideReply(): \Symfony\Component\HttpFoundation\RedirectResponse
    {
        $report = $this->getContext()?->getEntity()->getInstance();
        if ($report instanceof ForumReport && null !== $report->getReply()) {
            $this->moderationService->hideReply($report->getReply());
            $report->setStatus(ForumReportStatus::ActionTaken);
            $this->em->flush();
        }

        return $this->redirect($this->generateUrl('admin'));
    }

    public function lockThread(): \Symfony\Component\HttpFoundation\RedirectResponse
    {
        $report = $this->getContext()?->getEntity()->getInstance();
        if ($report instanceof ForumReport && null !== $report->getThread()) {
            $this->moderationService->lockThread($report->getThread());
            $report->setStatus(ForumReportStatus::ActionTaken);
            $this->em->flush();
        }

        return $this->redirect($this->generateUrl('admin'));
    }
}
