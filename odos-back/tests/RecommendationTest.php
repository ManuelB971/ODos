<?php

namespace App\Tests;

use App\Entity\Activity;
use App\Entity\Category;
use App\Service\LlmRankingService;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\ResponseInterface;

class RecommendationTest extends TestCase
{
    public function testReturnsTopKWithoutLlmWhenDisabled(): void
    {
        $service = new LlmRankingService(
            new ArrayAdapter(),
            $this->createMock(HttpClientInterface::class),
            new NullLogger(),
            'http://llm:11434',
            'test-model',
            3,
            2,
            20,
            false,
            60
        );

        $first = $this->makeActivity(1, 'A');
        $second = $this->makeActivity(2, 'B');
        $third = $this->makeActivity(3, 'C');

        $ranked = $service->rank(['Music'], [$first, $second, $third]);

        self::assertCount(2, $ranked);
        self::assertSame(1, $ranked[0]->getId());
        self::assertSame(2, $ranked[1]->getId());
    }

    public function testUsesLlmRankingOrderWhenResponseIsValid(): void
    {
        $response = $this->createMock(ResponseInterface::class);
        $response->method('toArray')->willReturn([
            'message' => ['content' => '{"ranked_ids":[2,1]}'],
        ]);
        $httpClient = $this->createMock(HttpClientInterface::class);
        $httpClient->method('request')->willReturn($response);

        $service = new LlmRankingService(
            new ArrayAdapter(),
            $httpClient,
            new NullLogger(),
            'http://llm:11434',
            'test-model',
            3,
            2,
            20,
            true,
            60
        );

        $first = $this->makeActivity(1, 'A');
        $second = $this->makeActivity(2, 'B');

        $ranked = $service->rank(['Music'], [$first, $second]);

        self::assertCount(2, $ranked);
        self::assertSame(2, $ranked[0]->getId());
        self::assertSame(1, $ranked[1]->getId());
    }

    private function makeActivity(int $id, string $name): Activity
    {
        $category = (new Category())->setName('Category');
        $activity = (new Activity())
            ->setName($name)
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
