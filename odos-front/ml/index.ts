import * as tf from '@tensorflow/tfjs';

import { Activity, activities, interestToCategoryMap } from '../data/activities';

export type { Activity };

export interface RecommendationModel {
  predict: (interests: string[]) => Promise<Activity[]>;
  load: () => Promise<boolean>;
  isLoaded: boolean;
}
///mettre sur un serveur le model et le mettre a jours créer une api pour appel 

export const createRecommendationModel = (): RecommendationModel => {
  let isModelLoaded = false;
  let model: tf.LayersModel | null = null;
  let useFallbackMode = true; 
  let tfInitialized = false; 
  
  const encodeInterests = (interests: string[]): tf.Tensor | null => {
    try {
      if (!tfInitialized || typeof tf === 'undefined') {
        console.warn('TensorFlow.js n\'est pas disponible, impossible d\'encoder les intérêts');
        return null;
      }
      
      const allInterests = Object.keys(interestToCategoryMap);
      const encoded = new Array(allInterests.length).fill(0);
      
      interests.forEach(interest => {
        const index = allInterests.indexOf(interest);
        if (index !== -1) {
          encoded[index] = 1;
        }
      });
      
      try {
        if (typeof tf.tensor2d === 'function') {
          return tf.tensor2d([encoded]);
        } else {
          console.warn('La fonction tf.tensor2d n\'est pas disponible');
          return null;
        }
      } catch (tensorError) {
        console.error('Erreur lors de la création du tenseur:', tensorError);
        return null;
      }
    } catch (error) {
      console.error('Erreur lors de l\'encodage des intérêts:', error);
      return null;
    }
  };
  
  const createModel = (): tf.LayersModel | null => {
    try {
      if (!tf.layers || typeof tf.layers.dense !== 'function' || typeof tf.sequential !== 'function') {
        console.warn('Les fonctions TensorFlow.js nécessaires ne sont pas disponibles');
        return null;
      }
      
      try {
        const inputLayer = tf.layers.dense({
          units: 30,
          activation: 'relu',
          inputShape: [30]
        });
        
        const hiddenLayer = tf.layers.dense({
          units: 20,
          activation: 'relu'
        });
        
        const outputLayer = tf.layers.dense({
          units: 5, 
          activation: 'softmax'
        });
        
        const newModel = tf.sequential();
        
        if (newModel && typeof newModel.add === 'function') {
          newModel.add(inputLayer);
          newModel.add(hiddenLayer);
          newModel.add(outputLayer);
          
          if (typeof newModel.compile === 'function') {
            newModel.compile({
              optimizer: 'adam',
              loss: 'categoricalCrossentropy',
              metrics: ['accuracy']
            });
            
            return newModel;
          } else {
            console.warn('La fonction compile du modèle n\'est pas disponible');
            return null;
          }
        } else {
          console.warn('Impossible d\'ajouter des couches au modèle');
          return null;
        }
      } catch (layerError) {
        console.error('Erreur lors de la création des couches:', layerError);
        return null;
      }
    } catch (error) {
      console.error('Erreur lors de la création du modèle:', error);
      return null;
    }
  };

  return {
    isLoaded: isModelLoaded,

    load: async (): Promise<boolean> => {
      try {
        tfInitialized = true;
        model = createModel();
        isModelLoaded = model !== null;
        return isModelLoaded;
      } catch (error) {
        console.error('Erreur lors du chargement du modèle:', error);
        return false;
      }
    },

    predict: async (interests: string[]): Promise<Activity[]> => {
      if (!isModelLoaded || !model || interests.length === 0) {
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
      }

      try {
        const input = encodeInterests(interests);
        if (!input) {
          return activities.slice(0, 5);
        }
        
        const prediction = model.predict(input) as tf.Tensor;
        await prediction.data();

        prediction.dispose();
        input.dispose();

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
      } catch (error) {
        console.error('Erreur de prédiction:', error);
        return activities.slice(0, 5);
      }
    }
  };
};
