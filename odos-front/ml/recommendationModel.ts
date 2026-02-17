import * as tf from '@tensorflow/tfjs';
import { activities, Activity, interestToCategoryMap } from '../data/activities';

export type { Activity };

export interface RecommendationModel {
  predict: (interests: string[]) => Promise<Activity[]>;
  load: () => Promise<boolean>;
  isLoaded: boolean;
}

export const createRecommendationModel = (): RecommendationModel => {
  let isModelLoaded = false;
  let model: tf.LayersModel | null = null;
  let fallbackMode = true;

  const encodeInterests = (interests: string[]): tf.Tensor2D => {
    const allInterests = Object.keys(interestToCategoryMap);
    const encoded = allInterests.map((interest) => (interests.includes(interest) ? 1 : 0));
    return tf.tensor2d([encoded]);
  };

  const createModel = (): tf.LayersModel => {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [Object.keys(interestToCategoryMap).length] }));
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 5, activation: 'softmax' }));
    model.compile({ optimizer: 'adam', loss: 'categoricalCrossentropy' });
    return model;
  };

  const getFallbackRecommendations = (interests: string[]): Activity[] => {
    const relevantCategories = new Set<string>();
    interests.forEach(interest => {
      const categories = interestToCategoryMap[interest] || [];
      categories.forEach(category => relevantCategories.add(category));
    });

    let filtered = activities.filter(activity => relevantCategories.has(activity.category));

    if (filtered.length < 5) {
      const remaining = activities.filter(a => !filtered.includes(a));
      filtered = [...filtered, ...remaining.sort(() => 0.5 - Math.random()).slice(0, 5 - filtered.length)];
    }

    return filtered.sort(() => 0.5 - Math.random()).slice(0, 5);
  };

  return {
    isLoaded: isModelLoaded,

    load: async (): Promise<boolean> => {
      try {
        await tf.ready();
        await tf.setBackend('cpu');
        model = createModel();
        isModelLoaded = true;
        fallbackMode = false;
        return true;
      } catch (error) {
        console.warn('Erreur lors du chargement de TensorFlow.js, mode failsafe activé', error);
        fallbackMode = true;
        return false;
      }
    },

    predict: async (interests: string[]): Promise<Activity[]> => {
      if (fallbackMode || !model || !isModelLoaded || interests.length === 0) {
        return getFallbackRecommendations(interests);
      }

      try {
        const input = encodeInterests(interests);
        const prediction = model.predict(input) as tf.Tensor;
        await prediction.data(); 

        prediction.dispose();
        input.dispose();

        return getFallbackRecommendations(interests); 
      } catch (error) {
        console.error('Erreur de prédiction, utilisation du fallback :', error);
        return getFallbackRecommendations(interests);
      }
    }
  };
};
