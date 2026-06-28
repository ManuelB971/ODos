<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\ContentReport;
use App\Enum\ForumReportStatus;
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
use Symfony\Component\HttpFoundation\RedirectResponse;

/** @extends AbstractCrudController<ContentReport> */
class ContentReportCrudController extends AbstractCrudController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
    ) {
    }

    public static function getEntityFqcn(): string
    {
        return ContentReport::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Signalement de contenu')
            ->setEntityLabelInPlural('Signalements contenu')
            ->setDefaultSort(['createdAt' => 'DESC'])
            ->setPaginatorPageSize(30);
    }

    public function configureActions(Actions $actions): Actions
    {
        return $actions
            ->disable(Action::NEW, Action::DELETE)
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->add(Crud::PAGE_INDEX, Action::new('markReviewed', 'Marquer traité')->linkToCrudAction('markReviewed'))
            ->add(Crud::PAGE_INDEX, Action::new('markDismissed', 'Rejeter')->linkToCrudAction('markDismissed'))
            ->add(Crud::PAGE_INDEX, Action::new('hideComment', 'Masquer commentaire')->linkToCrudAction('hideComment'))
            ->add(Crud::PAGE_DETAIL, Action::new('markReviewed', 'Marquer traité')->linkToCrudAction('markReviewed'))
            ->add(Crud::PAGE_DETAIL, Action::new('markDismissed', 'Rejeter')->linkToCrudAction('markDismissed'))
            ->add(Crud::PAGE_DETAIL, Action::new('hideComment', 'Masquer commentaire')->linkToCrudAction('hideComment'));
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add(ChoiceFilter::new('status')->setChoices($this->statusChoices()))
            ->add('targetType');
    }

    public function configureFields(string $pageName): iterable
    {
        yield IdField::new('id')->onlyOnIndex();
        yield AssociationField::new('reporter');
        yield TextField::new('targetType');
        yield IntegerField::new('targetId');
        yield TextField::new('reason');
        yield TextareaField::new('details')
            ->hideOnIndex()
            ->setNumOfRows(4);
        yield ChoiceField::new('status')->setChoices($this->statusChoices());
        yield AssociationField::new('reportedUser')->onlyOnDetail();
        yield AssociationField::new('comment')->onlyOnDetail();
        yield AssociationField::new('chatMessage')->onlyOnDetail();
        yield AssociationField::new('groupMessage')->onlyOnDetail();
        yield DateTimeField::new('createdAt');
    }

    public function markReviewed(): RedirectResponse
    {
        return $this->applyStatus(ForumReportStatus::Reviewed);
    }

    public function markDismissed(): RedirectResponse
    {
        return $this->applyStatus(ForumReportStatus::Dismissed);
    }

    public function hideComment(): RedirectResponse
    {
        $report = $this->getContext()?->getEntity()->getInstance();
        if ($report instanceof ContentReport && null !== $report->getComment()) {
            $report->getComment()->setIsHidden(true);
            $report->setStatus(ForumReportStatus::ActionTaken);
            $this->em->flush();
        }

        return $this->redirect($this->generateUrl('admin'));
    }

    private function applyStatus(ForumReportStatus $status): RedirectResponse
    {
        $report = $this->getContext()?->getEntity()->getInstance();
        if ($report instanceof ContentReport) {
            $report->setStatus($status);
            $this->em->flush();
        }

        return $this->redirect($this->generateUrl('admin'));
    }

    /**
     * @return array<string, ForumReportStatus>
     */
    private function statusChoices(): array
    {
        return [
            'En attente' => ForumReportStatus::Pending,
            'Traité' => ForumReportStatus::Reviewed,
            'Rejeté' => ForumReportStatus::Dismissed,
            'Action prise' => ForumReportStatus::ActionTaken,
        ];
    }
}
