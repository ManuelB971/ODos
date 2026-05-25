<?php

declare(strict_types=1);

namespace App\Tests;

use App\Entity\Activity;
use App\Entity\BadgeDefinition;
use App\Entity\Category;
use App\Entity\User;
use App\Enum\BadgeRuleType;
use App\Gamification\GamificationEvent;
use App\Gamification\GamificationService;
use App\Repository\UserBadgeRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

final class GamificationServiceTest extends KernelTestCase
{
    private EntityManagerInterface $em;
    private GamificationService $gamification;
    private UserBadgeRepository $userBadgeRepository;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = static::getContainer()->get(EntityManagerInterface::class);
        $this->gamification = static::getContainer()->get(GamificationService::class);
        $this->userBadgeRepository = static::getContainer()->get(UserBadgeRepository::class);
    }

    public function testActivityViewUnlocksFirstDiscoveryBadge(): void
    {
        $user = $this->createUser('gamif_view_'.uniqid('', true).'@test.local');
        $badge = $this->createBadge('test_first_view_'.uniqid('', true), BadgeRuleType::ActivityViews, ['threshold' => 1]);
        $activity = $this->createActivity();

        $unlocked = $this->gamification->evaluateAndAward(
            $user,
            GamificationEvent::ACTIVITY_VIEWED,
            ['activityId' => $activity->getId()]
        );

        self::assertCount(1, $unlocked);
        self::assertTrue($this->userBadgeRepository->userOwnsBadge($user, $badge));

        // Idempotent : second appel ne redébloque pas
        $again = $this->gamification->evaluateAndAward(
            $user,
            GamificationEvent::ACTIVITY_VIEWED,
            ['activityId' => $activity->getId()]
        );
        self::assertCount(0, $again);
    }

    public function testFavoriteCountThreshold(): void
    {
        $user = $this->createUser('gamif_fav_'.uniqid('', true).'@test.local');
        $badge = $this->createBadge('test_fav_'.uniqid('', true), BadgeRuleType::FavoritesCount, ['threshold' => 2]);

        self::assertCount(0, $this->gamification->evaluateAndAward($user, GamificationEvent::FAVORITE_ADDED));

        $a1 = $this->createActivity();
        $a2 = $this->createActivity();
        $user->addFavorite($a1);
        $user->addFavorite($a2);
        $this->em->flush();

        $unlocked = $this->gamification->evaluateAndAward($user, GamificationEvent::FAVORITE_ADDED);
        self::assertCount(1, $unlocked);
        self::assertTrue($this->userBadgeRepository->userOwnsBadge($user, $badge));
    }

    private function createUser(string $email): User
    {
        $user = new User();
        $user->setEmail($email);
        $user->setPassword('test');
        $user->setRoles(['ROLE_USER']);
        $user->setConsentedAt(new \DateTimeImmutable());
        $this->em->persist($user);
        $this->em->flush();

        return $user;
    }

    private function createBadge(string $code, BadgeRuleType $type, array $config): BadgeDefinition
    {
        $badge = new BadgeDefinition();
        $badge->setCode($code);
        $badge->setName('Test '.$code);
        $badge->setDescription('Test badge');
        $badge->setRuleType($type);
        $badge->setRuleConfig($config);
        $badge->setIsActive(true);
        $this->em->persist($badge);
        $this->em->flush();

        return $badge;
    }

    private function createActivity(): Activity
    {
        $cat = new Category();
        $cat->setName('TestCat_'.uniqid('', true));
        $this->em->persist($cat);

        $activity = new Activity();
        $activity->setName('Test Act');
        $activity->setDescription('Desc');
        $activity->setLatitude(45.0);
        $activity->setLongitude(4.0);
        $activity->setCategory($cat);
        $activity->setIsPublished(true);
        $this->em->persist($activity);
        $this->em->flush();

        return $activity;
    }
}
