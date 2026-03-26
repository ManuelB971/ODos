<?php

namespace App\Service;

use App\DTO\CandidateForLlm;
use App\Entity\Activity;
use Psr\Log\LoggerInterface;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

final class LlmRankingService
{
    public function __construct(
        private CacheInterface $cache,
        private HttpClientInterface $httpClient,
        private LoggerInterface $logger,
        private string $llmBaseUrl,
        private string $llmModel,
        private int $llmTimeout,
        private int $topK,
        private int $candidateMax,
        private bool $llmEnabled,
        private int $cacheTtlSeconds,
    ) {}

    /**
     * Re-rank candidate activities using the LLM.
     *
     * @param string[]   $interestNames  e.g. ["Music", "Nature"]
     * @param Activity[] $candidates     Doctrine entities from DB
     * @param string|null $cacheKey      Cache key (optional) to avoid repeated LLM calls
     * @return Activity[] reordered list (max $topK items)
     */
    public function rank(array $interestNames, array $candidates, ?string $cacheKey = null): array
    {
        if (!$this->llmEnabled || \count($candidates) === 0) {
            return \array_slice($candidates, 0, $this->topK);
        }

        $candidates = \array_slice($candidates, 0, $this->candidateMax);
        $candidateMap = [];
        $dtos = [];

        foreach ($candidates as $activity) {
            $candidateMap[$activity->getId()] = $activity;
            $cat = $activity->getCategory();
            $catName = \is_object($cat) && method_exists($cat, 'getName') ? $cat->getName() : '';
            // Keep prompt small to reduce latency/timeouts on local CPU models.
            $desc = mb_substr((string) $activity->getDescription(), 0, 120);

            $dtos[] = new CandidateForLlm(
                $activity->getId(),
                $activity->getName(),
                $desc,
                $catName,
                $activity->getCity(),
            );
        }

        $candidateIds = array_keys($candidateMap);

        try {
            if ($cacheKey) {
                $rankedIds = $this->cache->get($cacheKey, function (ItemInterface $item) use ($interestNames, $dtos, $candidateIds) {
                    $item->expiresAfter($this->cacheTtlSeconds);
                    return $this->callLlm($interestNames, $dtos, $candidateIds);
                });
            } else {
                $rankedIds = $this->callLlm($interestNames, $dtos, $candidateIds);
            }

            if (!\is_array($rankedIds)) {
                throw new \RuntimeException('LLM returned invalid ranked_ids format (cache or live).');
            }

            // Extra validation (cache safety): keep only IDs that exist in current candidates
            $rankedIds = \array_values(\array_filter(
                \array_map('intval', $rankedIds),
                fn(int $id) => \in_array($id, $candidateIds, true),
            ));
        } catch (\Throwable $e) {
            $this->logger->warning('LLM re-ranking failed, falling back to DB order: '.$e->getMessage());
            return \array_slice($candidates, 0, $this->topK);
        }

        return $this->reorder($candidateMap, $rankedIds);
    }

    /**
     * @param string[]           $interests
     * @param CandidateForLlm[]  $dtos
     * @param int[]              $validIds
     * @return int[] ranked activity IDs
     */
    private function callLlm(array $interests, array $dtos, array $validIds): array
    {
        $systemPrompt = <<<PROMPT
You are a recommendation re-ranking engine. You receive a user's interests and a list of activity candidates.
Your task: reorder the candidate IDs by relevance to the user's interests.
Rules:
- Return ONLY a JSON object: {"ranked_ids": [id1, id2, ...]}
- Use ONLY IDs from the provided candidates. Do NOT invent IDs.
- Return at most {$this->topK} IDs.
- Most relevant first.
- No extra text, no markdown, no explanation outside the JSON.
PROMPT;

        $userPrompt = json_encode([
            'user_interests' => $interests,
            'candidates' => $dtos,
        ], \JSON_UNESCAPED_UNICODE | \JSON_THROW_ON_ERROR);

        $response = $this->httpClient->request('POST', $this->llmBaseUrl . '/api/chat', [
            'timeout' => $this->llmTimeout,
            'json' => [
                'model' => $this->llmModel,
                'messages' => [
                    ['role' => 'system', 'content' => $systemPrompt],
                    ['role' => 'user', 'content' => $userPrompt],
                ],
                'stream' => false,
                'format' => 'json',
            ],
        ]);

        $body = $response->toArray();
        $content = $body['message']['content'] ?? '';

        $this->logger->info('LLM response received.', [
            'model' => $this->llmModel,
            'content_length' => \strlen($content),
        ]);

        $decoded = json_decode($content, true, 512, \JSON_THROW_ON_ERROR);
        $rankedIds = $decoded['ranked_ids'] ?? [];

        if (!\is_array($rankedIds)) {
            throw new \RuntimeException('LLM returned invalid ranked_ids format.');
        }

        // Strict validation: keep only IDs that exist in candidates
        $rankedIds = array_values(array_filter(
            array_map('intval', $rankedIds),
            fn(int $id) => \in_array($id, $validIds, true),
        ));

        return \array_slice($rankedIds, 0, $this->topK);
    }

    /**
     * Reorder candidates by LLM-ranked IDs, appending any missing ones at the end.
     *
     * @param array<int, Activity> $candidateMap  id => Activity
     * @param int[]                $rankedIds
     * @return Activity[]
     */
    private function reorder(array $candidateMap, array $rankedIds): array
    {
        $result = [];
        $used = [];

        foreach ($rankedIds as $id) {
            if (isset($candidateMap[$id])) {
                $result[] = $candidateMap[$id];
                $used[$id] = true;
            }
        }

        // Append candidates not returned by the LLM (fallback completeness)
        foreach ($candidateMap as $id => $activity) {
            if (!isset($used[$id]) && \count($result) < $this->topK) {
                $result[] = $activity;
            }
        }

        return $result;
    }
}
