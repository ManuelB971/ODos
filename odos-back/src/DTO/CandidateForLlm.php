<?php

namespace App\DTO;

/**
 * Lightweight DTO sent to the LLM for re-ranking.
 * Only public, non-sensitive activity fields are included.
 */
final class CandidateForLlm implements \JsonSerializable
{
    public function __construct(
        public readonly int $id,
        public readonly string $name,
        public readonly string $description,
        public readonly string $categoryName,
        public readonly ?string $city,
        public readonly ?float $ratingAverage = null,
        public readonly int $ratingCount = 0,
    ) {}

    public function jsonSerialize(): array
    {
        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'category' => $this->categoryName,
            'city' => $this->city,
        ];
        if ($this->ratingCount > 0) {
            $data['rating_average'] = $this->ratingAverage;
            $data['rating_count'] = $this->ratingCount;
        }

        return $data;
    }
}
