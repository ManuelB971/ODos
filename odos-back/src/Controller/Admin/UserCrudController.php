<?php

namespace App\Controller\Admin;

use App\Entity\User;
use EasyCorp\Bundle\EasyAdminBundle\Field\AssociationField;
use EasyCorp\Bundle\EasyAdminBundle\Field\ChoiceField;
use EasyCorp\Bundle\EasyAdminBundle\Field\EmailField;
use EasyCorp\Bundle\EasyAdminBundle\Field\IdField;
use EasyCorp\Bundle\EasyAdminBundle\Field\FormField;
use EasyCorp\Bundle\EasyAdminBundle\Field\TextField;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class UserCrudController extends AbstractCrudController
{
    public function __construct(
        private readonly UserPasswordHasherInterface $passwordHasher
    ) {}

    public static function getEntityFqcn(): string
    {
        return User::class;
    }

    public function configureFields(string $pageName): iterable
    {
        return [
            IdField::new('id')->hideOnForm(),
            EmailField::new('email'),
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
            AssociationField::new('interests', 'Intérêts'),
        ];
    }

    public function persistEntity($entityManager, $entityInstance): void
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

    public function updateEntity($entityManager, $entityInstance): void
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
                $entityInstance->setRoles(array_unique($roles));
                $this->getContext()->getRequest()->getSession()->getFlashBag()->add('warning', 'Tentative bloquée : vous ne pouvez pas retirer vos propres droits d\'Administrateur.');
            }
        }

        $plainPassword = $entityInstance->getPlainPassword();
        if ($plainPassword) {
            $entityInstance->setPassword($this->passwordHasher->hashPassword($entityInstance, $plainPassword));
            $entityInstance->setPlainPassword(null);
        }

        parent::updateEntity($entityManager, $entityInstance);
    }

    public function deleteEntity($entityManager, $entityInstance): void
    {
        if ($entityInstance instanceof User) {
            $currentUser = $this->getUser();
            if ($currentUser && $currentUser->getUserIdentifier() === $entityInstance->getUserIdentifier()) {
                $this->getContext()->getRequest()->getSession()->getFlashBag()->add('danger', 'Tentative bloquée : vous ne pouvez pas supprimer votre propre compte Administrateur.');
                return; // Stop the deletion
            }
        }

        parent::deleteEntity($entityManager, $entityInstance);
    }
}
