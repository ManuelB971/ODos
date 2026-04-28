<?php

namespace App\Controller\Admin;

use App\Entity\Activity;
use App\Service\ActivityPhotoUploader;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Config\Filters;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\BooleanField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ImageField;
use EasyCorp\Bundle\EasyAdminBundle\Field\MoneyField;
use EasyCorp\Bundle\EasyAdminBundle\Field\NumberField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextEditorField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Field\UrlField;
use EasyCorp\Bundle\EasyAdminBundle\Filter\BooleanFilter;
use Symfony\Component\Form\Extension\Core\Type\FileType;
use Symfony\Component\HttpFoundation\File\UploadedFile;
use Symfony\Component\HttpFoundation\RequestStack;

class ActivityCrudController extends AbstractCrudController
{
    /**
     * Nom du champ de formulaire (non mappé) utilisé pour téléverser une nouvelle photo.
     */
    private const PHOTO_FORM_FIELD = 'imageFile';

    public function __construct(
        private readonly RequestStack $requestStack,
        private readonly ActivityPhotoUploader $photoUploader,
    ) {
    }

    public static function getEntityFqcn(): string
    {
        return Activity::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setFormOptions(
                ['attr' => ['enctype' => 'multipart/form-data']],
                ['attr' => ['enctype' => 'multipart/form-data']],
            );
    }

    public function configureFilters(Filters $filters): Filters
    {
        return $filters
            ->add(BooleanFilter::new('isPublished', 'Publiée'));
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->hideOnForm(),
            TextField::new('name', 'Nom'),
            TextEditorField::new('description'),
            TextField::new('city', 'Ville'),
            NumberField::new('latitude')->setNumDecimals(6),
            NumberField::new('longitude')->setNumDecimals(6),
            AssociationField::new('category', 'Catégorie'),
            MoneyField::new('price', 'Prix')->setCurrency('EUR')->setStoredAsCents(false)->setRequired(false),

            ImageField::new('imageUrl', 'Photo actuelle')
                ->setBasePath('/')
                ->onlyOnIndex(),
            UrlField::new('imageUrl', 'Image (URL)')
                ->setRequired(false)
                ->onlyOnForms()
                ->setHelp('URL externe (laisser vide pour utiliser le téléversement ci-dessous).'),

            TextField::new(self::PHOTO_FORM_FIELD, 'Photo (téléversement)')
                ->setFormType(FileType::class)
                ->setFormTypeOptions([
                    'required' => false,
                    'mapped' => false,
                    'attr' => ['accept' => 'image/*'],
                ])
                ->onlyOnForms()
                ->setHelp('Formats acceptés : JPG, PNG, WEBP, GIF (max 5 Mo). Écrase l\'URL d\'image si fourni.'),

            DateTimeField::new('dateStart', 'Date de début')->setRequired(false),
            DateTimeField::new('dateEnd', 'Date de fin')->setRequired(false),
            BooleanField::new('isPublished', 'Publiée')
                ->setHelp('Si désactivé, l\'activité est masquée pour les utilisateurs (API) sauf administrateurs.'),
            AssociationField::new('favoritedBy', 'Favoris (utilisateurs)')
                ->onlyOnDetail()
                ->setHelp('Lecture seule : utilisateurs ayant mis cette activité en favori.'),
        ];
    }

    public function persistEntity(EntityManagerInterface $entityManager, $entityInstance): void
    {
        if ($entityInstance instanceof Activity) {
            $this->handleUploadedPhoto($entityInstance);
        }
        parent::persistEntity($entityManager, $entityInstance);
    }

    public function updateEntity(EntityManagerInterface $entityManager, $entityInstance): void
    {
        if ($entityInstance instanceof Activity) {
            $this->handleUploadedPhoto($entityInstance);
        }
        parent::updateEntity($entityManager, $entityInstance);
    }

    /**
     * Récupère l'éventuel fichier téléversé via le champ non-mappé `imageFile`
     * et met à jour `imageUrl` sur l'entité.
     */
    private function handleUploadedPhoto(Activity $activity): void
    {
        $request = $this->requestStack->getCurrentRequest();
        if (null === $request) {
            return;
        }

        $files = $request->files->all();
        // EasyAdmin nomme le formulaire d'après le FQCN court de l'entité ("Activity").
        $entityFormFiles = $files['Activity'] ?? null;
        if (!is_array($entityFormFiles)) {
            return;
        }

        $uploaded = $entityFormFiles[self::PHOTO_FORM_FIELD] ?? null;
        if (!$uploaded instanceof UploadedFile) {
            return;
        }

        $publicPath = $this->photoUploader->upload($uploaded);
        $activity->setImageUrl($publicPath);
    }
}
