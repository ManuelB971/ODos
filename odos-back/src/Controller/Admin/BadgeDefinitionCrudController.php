<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Entity\BadgeDefinition;
use App\Enum\BadgeRuleType;
use App\Service\BadgePhotoUploader;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\CodeEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ImageField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IntegerField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\UrlField;
use EasyCorp\Bundle\EasyAdminBundle\Filter\BooleanFilter;
use EasyCorp\Bundle\EasyAdminBundle\Filter\ChoiceFilter;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * @extends AbstractCrudController<BadgeDefinition>
 */
final class BadgeDefinitionCrudController extends AbstractCrudController
{
    public const PHOTO_FORM_FIELD = 'badgeImageFile';

    public function __construct(
        private readonly BadgePhotoUploader $photoUploader,
        private readonly RequestStack $requestStack,
    ) {
    }

    public static function getEntityFqcn(): string
    {
        return BadgeDefinition::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Badge')
            ->setEntityLabelInPlural('Badges')
            ->setDefaultSort(['sortOrder' => 'ASC', 'name' => 'ASC'])
            ->setSearchFields(['code', 'name']);
    }

    public function configureActions(Actions $actions): Actions
    {
        $award = Action::new('award', 'Attribuer', 'fas fa-gift')
            ->linkToRoute('admin_badge_award', fn (BadgeDefinition $entity): array => [
                'badgeId' => $entity->getId(),
            ])
            ->displayIf(static fn (BadgeDefinition $b): bool => $b->isActive());

        return $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL)
            ->add(Crud::PAGE_INDEX, $award)
            ->add(Crud::PAGE_DETAIL, $award);
    }

    public function configureFilters(Filters $filters): Filters
    {
        $ruleChoices = [];
        foreach (BadgeRuleType::cases() as $case) {
            $ruleChoices[$case->label()] = $case->value;
        }

        return $filters
            ->add(BooleanFilter::new('isActive', 'Actif'))
            ->add(ChoiceFilter::new('ruleType')->setChoices($ruleChoices));
    }

    public function configureFields(string $pageName): iterable
    {
        $ruleChoices = [];
        foreach (BadgeRuleType::cases() as $case) {
            $ruleChoices[$case->label()] = $case;
        }

        yield IdField::new('id')->hideOnForm();
        yield TextField::new('code', 'Code (slug)')
            ->setHelp('Minuscules, chiffres, underscores. Ex. first_discovery');
        yield TextField::new('name', 'Nom affiché');
        yield TextEditorField::new('description', 'Description')
            ->setHelp('Visible dans l\'app et sur le profil utilisateur.');

        yield ImageField::new('imageUrl', 'Image actuelle')
            ->setBasePath('/')
            ->onlyOnIndex()
            ->onlyOnDetail();
        yield UrlField::new('imageUrl', 'Image (URL)')
            ->onlyOnForms()
            ->setRequired(false)
            ->setHelp('URL externe ou laisser vide et téléverser ci-dessous.');
        yield TextField::new(self::PHOTO_FORM_FIELD, 'Image (téléversement)')
            ->setFormType(FileType::class)
            ->setFormTypeOptions([
                'required' => false,
                'mapped' => false,
                'attr' => ['accept' => 'image/*'],
            ])
            ->onlyOnForms()
            ->setHelp('JPG, PNG, WEBP, GIF — max 2 Mo. La photo s\'affiche sur le profil et lors du déblocage.');

        yield IntegerField::new('sortOrder', 'Ordre vitrine')->setRequired(false);
        yield BooleanField::new('isActive', 'Actif (attribuable)');
        yield BooleanField::new('isHiddenByDefault', 'Masqué sur profil par défaut')
            ->setHelp('L\'utilisateur peut l\'afficher ensuite dans « Mes badges ».');

        yield ChoiceField::new('ruleType', 'Règle d\'attribution')
            ->setChoices($ruleChoices)
            ->renderExpanded(false);
        yield CodeEditorField::new('ruleConfig', 'Config JSON (règle)')
            ->onlyOnForms()
            ->setHelp('Ex. {"threshold": 5} ou {"threshold": 3, "categoryId": 2}')
            ->setFormTypeOption('required', false);

        yield DateTimeField::new('createdAt')->hideOnForm();
        yield DateTimeField::new('updatedAt')->hideOnForm();
    }

    public function persistEntity(EntityManagerInterface $entityManager, $entityInstance): void
    {
        if ($entityInstance instanceof BadgeDefinition) {
            $this->handleUploadedPhoto($entityInstance);
        }
        parent::persistEntity($entityManager, $entityInstance);
    }

    public function updateEntity(EntityManagerInterface $entityManager, $entityInstance): void
    {
        if ($entityInstance instanceof BadgeDefinition) {
            $this->handleUploadedPhoto($entityInstance);
        }
        parent::updateEntity($entityManager, $entityInstance);
    }

    private function handleUploadedPhoto(BadgeDefinition $badge): void
    {
        $request = $this->requestStack->getCurrentRequest();
        if (null === $request) {
            return;
        }

        $files = $request->files->all();
        $entityFormFiles = $files['BadgeDefinition'] ?? null;
        if (!is_array($entityFormFiles)) {
            return;
        }

        $uploaded = $entityFormFiles[self::PHOTO_FORM_FIELD] ?? null;
        if (!$uploaded instanceof UploadedFile) {
            return;
        }

        $badge->setImageUrl($this->photoUploader->upload($uploaded));
    }
}
