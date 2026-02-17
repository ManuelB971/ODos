import { useEffect, useState, useCallback } from 'react';
import { createRecommendationModel, Activity } from '@/ml/recommendationModel';

const model = createRecommendationModel();

export const useRecommendations = (interests: string[]) => {
  const [recommendations, setRecommendations] = useState<Activity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const generateRecommendations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!model.isLoaded) {
        const success = await model.load();
        if (!success) {
          console.warn('Fallback mode activé dans le modèle.');
        }
      }

      const results = await model.predict(interests);
      setRecommendations(results);
    } catch (err) {
      setError('Une erreur est survenue lors de la génération des recommandations.');
      console.error(err);
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
