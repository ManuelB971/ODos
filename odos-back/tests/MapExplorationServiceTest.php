<?php

declare(strict_types=1);

namespace App\Tests;

use App\Entity\User;
use App\Gamification\GamificationService;
use App\Gamification\MapExplorationService;
use App\Repository\ActivityRepository;
use App\Repository\UserMapCellRepository;
use App\Service\MapExplorationZoneRegistry;
use Doctrine\ORM\EntityManagerInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;

final class MapExplorationServiceTest extends TestCase
{
    private EntityManagerInterface&MockObject $em;
    private UserMapCellRepository&MockObject $cells;

    protected function setUp(): void
    {
        $this->em = $this->createMock(EntityManagerInterface::class);
        $this->cells = $this->createMock(UserMapCellRepository::class);
    }

    public function testDisablingWithdrawsConsentAndErasesVisitedCells(): void
    {
        $user = (new User())
            ->setMapExplorationEnabled(true)
            ->setMapExplorationConsentAt(new \DateTimeImmutable('2026-01-01'));

        $this->cells->expects(self::once())->method('deleteForUser')->with($user)->willReturn(3);
        $this->em->expects(self::once())->method('flush');

        $this->service()->setEnabled($user, false);

        self::assertFalse($user->isMapExplorationEnabled());
        self::assertNull($user->getMapExplorationConsentAt());
        self::assertFalse($user->isMapExplorationActive());
    }

    public function testEnablingKeepsHistoryAndDoesNotImplyConsent(): void
    {
        $user = new User();

        $this->cells->expects(self::never())->method('deleteForUser');

        $this->service()->setEnabled($user, true);

        self::assertTrue($user->isMapExplorationEnabled());
        // Activer le réglage ne vaut pas consentement : la carte le redemande.
        self::assertNull($user->getMapExplorationConsentAt());
        self::assertFalse($user->isMapExplorationActive());
    }

    private function service(): MapExplorationService
    {
        $registry = new MapExplorationZoneRegistry($this->createMock(ActivityRepository::class));
        // setEnabled() n'utilise pas la gamification : instance sans dépendances.
        $gamification = (new \ReflectionClass(GamificationService::class))->newInstanceWithoutConstructor();

        return new MapExplorationService($this->em, $registry, $this->cells, $gamification);
    }
}
