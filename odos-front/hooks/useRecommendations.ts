import { useEffect, useState, useCallback } from 'react';
import { fetchRecommendations } from '@/scripts/api';
import { ApiActivity } from '@/types';

export const useRecommendations = (interests: string[]) => {
  const [recommendations, setRecommendations] = useState<ApiActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const results = await fetchRecommendations();
      setRecommendations(results);
    } catch (err: any) {
      // 401 means not authenticated — not an error per se
      if (err?.response?.status === 401) {
        setRecommendations([]);
      } else {
        setError('Impossible de charger les recommandations.');
        console.error('[useRecommendations]', err);
      }
    } finally {
      setLoading(false);
    }
  }, [interests]);

  useEffect(() => {
    if (interests.length > 0) {
      generateRecommendations();
    } else {
      setRecommendations([]);
    }
  }, [interests, generateRecommendations]);

  return {
    recommendations,
    loading,
    error,
    refresh: generateRecommendations,
  };
};
