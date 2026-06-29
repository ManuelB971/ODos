<?php

declare(strict_types=1);

namespace App\Tests;

use App\Controller\Admin\ActivityCrudController;
use App\Controller\Admin\ActivityGroupCrudController;
use App\Controller\Admin\AdminAuditLogCrudController;
use App\Controller\Admin\AdminWebauthnCredentialCrudController;
use App\Controller\Admin\AppThemeCrudController;
use App\Controller\Admin\BadgeDefinitionCrudController;
use App\Controller\Admin\CategoryCrudController;
use App\Controller\Admin\CommentCrudController;
use App\Controller\Admin\ContentReportCrudController;
use App\Controller\Admin\ForumReplyCrudController;
use App\Controller\Admin\ForumReportCrudController;
use App\Controller\Admin\ForumThreadCrudController;
use App\Controller\Admin\ParcoursCrudController;
use App\Controller\Admin\RefreshTokenCrudController;
use App\Controller\Admin\UserBadgeCrudController;
use App\Controller\Admin\UserCrudController;
use EasyCorp\Bundle\EasyAdminBundle\Config\Action;
use EasyCorp\Bundle\EasyAdminBundle\Config\Actions;
use EasyCorp\Bundle\EasyAdminBundle\Config\Crud;
use EasyCorp\Bundle\EasyAdminBundle\Controller\AbstractCrudController;
use PHPUnit\Framework\TestCase;

/**
 * EasyAdmin fusionne configureActions() du dashboard (NEW/EDIT/DELETE…) avec celui
 * de chaque CRUD. Re-ajouter EDIT provoque une InvalidArgumentException.
 */
final class AdminCrudActionsTest extends TestCase
{
    /**
     * @return list<class-string<AbstractCrudController<object>>>
     */
    private function crudControllers(): array
    {
        return [
            ActivityCrudController::class,
            ActivityGroupCrudController::class,
            AdminAuditLogCrudController::class,
            AdminWebauthnCredentialCrudController::class,
            AppThemeCrudController::class,
            BadgeDefinitionCrudController::class,
            CategoryCrudController::class,
            CommentCrudController::class,
            ContentReportCrudController::class,
            ForumReplyCrudController::class,
            ForumReportCrudController::class,
            ForumThreadCrudController::class,
            ParcoursCrudController::class,
            RefreshTokenCrudController::class,
            UserBadgeCrudController::class,
            UserCrudController::class,
        ];
    }

    public function testConfigureActionsDoesNotDuplicateDashboardDefaults(): void
    {
        foreach ($this->crudControllers() as $controllerClass) {
            $defaults = $this->dashboardDefaultActions();
            $controller = $this->newCrudController($controllerClass);
            $controller->configureActions($defaults);
            self::addToAssertionCount(1);
        }
    }

    private function dashboardDefaultActions(): Actions
    {
        return Actions::new()
            ->addBatchAction(Action::BATCH_DELETE)
            ->add(Crud::PAGE_INDEX, Action::NEW)
            ->add(Crud::PAGE_INDEX, Action::EDIT)
            ->add(Crud::PAGE_INDEX, Action::DELETE)
            ->add(Crud::PAGE_DETAIL, Action::EDIT)
            ->add(Crud::PAGE_DETAIL, Action::INDEX)
            ->add(Crud::PAGE_DETAIL, Action::DELETE)
            ->add(Crud::PAGE_EDIT, Action::SAVE_AND_RETURN)
            ->add(Crud::PAGE_EDIT, Action::SAVE_AND_CONTINUE)
            ->add(Crud::PAGE_NEW, Action::SAVE_AND_RETURN)
            ->add(Crud::PAGE_NEW, Action::SAVE_AND_ADD_ANOTHER);
    }

    /**
     * @param class-string<AbstractCrudController<object>> $controllerClass
     */
    private function newCrudController(string $controllerClass): AbstractCrudController
    {
        $reflection = new \ReflectionClass($controllerClass);

        return $reflection->newInstanceWithoutConstructor();
    }
}
