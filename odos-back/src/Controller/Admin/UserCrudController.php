<?php

namespace App\Controller\Admin;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\DateTimeField;
use EasyCorp\Bundle\EasyAdminBundle\Field\EmailField;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ImageField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextareaField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

/**
 * @extends AbstractCrudController<User>
 */
class UserCrudController extends AbstractCrudController
{
    public function __construct(
        private readonly UserPasswordHasherInterface $passwordHasher
    ) {}

    public static function getEntityFqcn(): string
    {
        return User::class;
    }

    public function configureCrud(Crud $crud): Crud
    {
        return $crud
            ->setEntityLabelInSingular('Utilisateur')
            ->setEntityLabelInPlural('Utilisateurs')
            ->setSearchFields(['email', 'alias', 'homeCity'])
            ->setDefaultSort(['id' => 'DESC']);
    }

    public function configureActions(Actions $actions): Actions
    {
        return $actions
            ->add(Crud::PAGE_INDEX, Action::DETAIL);
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->hideOnForm(),
            EmailField::new('email'),
            TextField::new('alias', 'Alias public')
                ->setRequired(false)
                ->setHelp('Pseudo affiché dans l\'app à la place de l\'email.'),
            TextField::new('phoneNumber', 'Téléphone (MFA SMS)')
                ->setRequired(false)
                ->setHelp('E.164 recommandé, ex. +33612345678'),
            TextField::new('homeCity', 'Ville')
                ->setRequired(false),
            TextareaField::new('bio', 'Bio')
                ->setRequired(false)
                ->hideOnIndex()
                ->setNumOfRows(4),
            ImageField::new('avatarUrl', 'Avatar')
                ->setBasePath('/')
                ->onlyOnDetail(),
            DateTimeField::new('consentedAt', 'Consentement CGU')
                ->onlyOnDetail()
                ->setDisabled(true),
            AssociationField::new('favorites', 'Favoris')
                ->onlyOnDetail()
                ->setHelp('Lecture seule : activités mises en favori par cet utilisateur.'),
            FormField::addPanel('Sécurité'),
            TextField::new('plainPassword', 'Mot de passe')
                ->onlyOnForms()
                ->setRequired($pageName === Crud::PAGE_NEW),
            ChoiceField::new('roles', 'Rôles')
                ->setChoices([
                    'Utilisateur' => 'ROLE_USER',
                    'Administrateur' => 'ROLE_ADMIN',
                ])
                ->allowMultipleChoices(),
            AssociationField::new('interests', 'Intérêts')
                ->onlyOnDetail(),
        ];
    }

    public function persistEntity(EntityManagerInterface $entityManager, $entityInstance): void
    {
        if (!$entityInstance instanceof User) {
            parent::persistEntity($entityManager, $entityInstance);
            return;
        }

        $plainPassword = $entityInstance->getPlainPassword();
        if ($plainPassword) {
            $entityInstance->setPassword($this->passwordHasher->hashPassword($entityInstance, $plainPassword));
            $entityInstance->setPlainPassword(null);
        }

        parent::persistEntity($entityManager, $entityInstance);
    }

    public function updateEntity(EntityManagerInterface $entityManager, $entityInstance): void
    {
        if (!$entityInstance instanceof User) {
            parent::updateEntity($entityManager, $entityInstance);
            return;
        }

        // Empêcher l'auto-démotion : un admin ne peut pas se retirer ses propres droits
        $currentUser = $this->getUser();
        if ($currentUser && $currentUser->getUserIdentifier() === $entityInstance->getUserIdentifier()) {
            if (!in_array('ROLE_ADMIN', $entityInstance->getRoles())) {
                $roles = $entityInstance->getRoles();
                $roles[] = 'ROLE_ADMIN';
                $entityInstance->setRoles(array_values(array_unique($roles)));
                $this->addFlash('warning', 'Tentative bloquée : vous ne pouvez pas retirer vos propres droits d\'Administrateur.');
            }
        }

        $plainPassword = $entityInstance->getPlainPassword();
        if ($plainPassword) {
            $entityInstance->setPassword($this->passwordHasher->hashPassword($entityInstance, $plainPassword));
            $entityInstance->setPlainPassword(null);
        }

        parent::updateEntity($entityManager, $entityInstance);
    }

    public function deleteEntity(EntityManagerInterface $entityManager, $entityInstance): void
    {
        if ($entityInstance instanceof User) {
            $currentUser = $this->getUser();
            if ($currentUser && $currentUser->getUserIdentifier() === $entityInstance->getUserIdentifier()) {
                $this->addFlash('danger', 'Tentative bloquée : vous ne pouvez pas supprimer votre propre compte Administrateur.');
                return; // Stop the deletion
            }
        }

        parent::deleteEntity($entityManager, $entityInstance);
    }
}
