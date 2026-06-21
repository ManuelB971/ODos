<?php

declare(strict_types=1);

namespace App\Tests;

use App\Entity\Activity;
use App\Entity\Category;
use App\Entity\User;
use App\Recommendation\CollaborativeRecommendationEngine;
use App\Repository\ActivityRepository;
use App\Service\LlmRankingService;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Tests unitaires du moteur de recommandation (sans DB).
 *
 * Le repository est mocké (il renvoie des tableaux), le LLM est instancié réel
 * mais DÉSACTIVÉ : dans ce mode {@see LlmRankingService::rank()} se contente de
 * tronquer la liste, ce qui laisse intact l'ordre produit par le moteur — on peut
 * donc vérifier exclusion, boosting CF et repli de façon déterministe.
 */
class CollaborativeRecommendationEngineTest extends TestCase
{
    public function testBoostsCoEngagedCandidatesToFront(): void
    {
        $a1 = $this->makeActivity(1);
        $a2 = $this->makeActivity(2);
        $a3 = $this->makeActivity(3);

        $repo = $this->createMock(ActivityRepository::class);
        $repo->method('findRecommendationCandidates')->willReturn([$a1, $a2, $a3]);
        // Le CF remonte 3 puis 2 ; 1 (non co-engagé) doit finir dernier.
        $repo->method('findCoEngagedActivityIds')->willReturn([3, 2]);

        $engine = new CollaborativeRecommendationEngine($repo, $this->disabledLlm());
        $user = $this->makeUser(10, visited: [$a1]); // graine non vide

        $result = $engine->recommend($user);

        self::assertSame([3, 2, 1], $this->ids($result));
    }

    public function testKeepsOriginalOrderWhenNoCoEngagement(): void
    {
        $a1 = $this->makeActivity(1);
        $a2 = $this->makeActivity(2);

        $repo = $this->createMock(ActivityRepository::class);
        $repo->method('findRecommendationCandidates')->willReturn([$a1, $a2]);
        $repo->method('findCoEngagedActivityIds')->willReturn([]);

        $engine = new CollaborativeRecommendationEngine($repo, $this->disabledLlm());
        $user = $this->makeUser(10, favorites: [$a1]);

        self::assertSame([1, 2], $this->ids($engine->recommend($user)));
    }

    public function testExcludesKnownActivitiesFromCandidateQuery(): void
    {
        $known = $this->makeActivity(5);
        $a1 = $this->makeActivity(1);

        $repo = $this->createMock(ActivityRepository::class);
        $repo->expects(self::once())
            ->method('findRecommendationCandidates')
            ->with(
                self::anything(),
                self::callback(static fn (array $excluded): bool => \in_array(5, $excluded, true)),
            )
            ->willReturn([$a1]);
        $repo->method('findCoEngagedActivityIds')->willReturn([]);

        $engine = new CollaborativeRecommendationEngine($repo, $this->disabledLlm());
        $user = $this->makeUser(10, favorites: [$known]);

        $engine->recommend($user);
    }

    public function testDoesNotRunCollaborativeFilteringWithoutSeed(): void
    {
        $a1 = $this->makeActivity(1);

        $repo = $this->createMock(ActivityRepository::class);
        $repo->method('findRecommendationCandidates')->willReturn([$a1]);
        // Aucun favori ni visite → pas de graine → on ne sollicite pas le CF.
        $repo->expects(self::never())->method('findCoEngagedActivityIds');

        $engine = new CollaborativeRecommendationEngine($repo, $this->disabledLlm());
        $user = $this->makeUser(10);

        self::assertSame([1], $this->ids($engine->recommend($user)));
    }

    public function testReturnsEmptyWhenNoCandidates(): void
    {
        $repo = $this->createMock(ActivityRepository::class);
        $repo->method('findRecommendationCandidates')->willReturn([]);

        $engine = new CollaborativeRecommendationEngine($repo, $this->disabledLlm());

        self::assertSame([], $engine->recommend($this->makeUser(10, visited: [$this->makeActivity(9)])));
    }

    public function testReturnsEmptyWhenNoCityResolved(): void
    {
        $repo = $this->createMock(ActivityRepository::class);
        $repo->expects(self::never())->method('findRecommendationCandidates');

        $engine = new CollaborativeRecommendationEngine($repo, $this->disabledLlm());
        $user = $this->makeUser(10, homeCity: null);

        self::assertSame([], $engine->recommend($user));
    }

    public function testPassesCityToCandidateQuery(): void
    {
        $a1 = $this->makeActivity(1);

        $repo = $this->createMock(ActivityRepository::class);
        $repo->expects(self::once())
            ->method('findRecommendationCandidates')
            ->with(
                self::anything(),
                self::anything(),
                'Lyon',
            )
            ->willReturn([$a1]);
        $repo->method('findCoEngagedActivityIds')->willReturn([]);

        $engine = new CollaborativeRecommendationEngine($repo, $this->disabledLlm());
        $user = $this->makeUser(10);
        $user->setHomeCity('Paris');

        self::assertSame([1], $this->ids($engine->recommend($user, 'Lyon')));
    }

    private function disabledLlm(): LlmRankingService
    {
        return new LlmRankingService(
            new ArrayAdapter(),
            $this->createMock(HttpClientInterface::class),
            new NullLogger(),
            'http://llm:11434',
            'test-model',
            3,     // timeout
            50,    // topK (assez large pour tout garder)
            50,    // candidateMax
            false, // disabled → pas d'appel HTTP
            60,    // cacheTtl
        );
    }

    /**
     * @param array<Activity> $activities
     *
     * @return array<int>
     */
    private function ids(array $activities): array
    {
        return array_map(static fn (Activity $a): ?int => $a->getId(), $activities);
    }

    /**
     * @param array<Activity> $visited
     * @param array<Activity> $favorites
     */
    private function makeUser(int $id, array $visited = [], array $favorites = [], ?string $homeCity = 'Paris'): User
    {
        $user = new User();
        $user->setHomeCity($homeCity);
        foreach ($visited as $activity) {
            $user->addVisitedActivity($activity);
        }
        foreach ($favorites as $activity) {
            $user->addFavorite($activity);
        }

        $ref = new \ReflectionProperty(User::class, 'id');
        $ref->setAccessible(true);
        $ref->setValue($user, $id);

        return $user;
    }

    private function makeActivity(int $id): Activity
    {
        $category = (new Category())->setName('Category');
        $activity = (new Activity())
            ->setName('A' . $id)
            ->setDescription('Description')
            ->setLatitude(48.0)
            ->setLongitude(2.0)
            ->setCategory($category)
            ->setIsPublished(true);

        $ref = new \ReflectionProperty(Activity::class, 'id');
        $ref->setAccessible(true);
        $ref->setValue($activity, $id);

        return $activity;
    }
}
