import { View, Text, ScrollView, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react-native';
import { Link } from 'expo-router';
import { useInterests } from '@/context/InterestContext';
import { useRecommendations } from '@/hooks/useRecommendations';
import { fetchActivities } from '@/scripts/api';
import { ApiActivity } from '@/types';

/** Helper: get the category display name from the API response */
const getCategoryName = (cat: ApiActivity['category']): string => {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object' && 'name' in cat) return cat.name;
  return '';
};

export default function HomeScreen() {
  const { interests } = useInterests();
  const { recommendations, loading, error } = useRecommendations(interests);
  const [activities, setActivities] = useState<ApiActivity[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(true);

  useEffect(() => {
    fetchActivities()
      .then(setActivities)
      .catch((err) => console.error('[HomeScreen] Erreur chargement activités:', err))
      .finally(() => setActivitiesLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.welcomeText}>Bienvenue sur ODOS</Text>

        <View style={styles.recommendationsContainer}>
          <Text style={styles.recommendationsTitle}>Recommandations</Text>

          {loading && <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />}
          {error && <Text style={styles.errorText}>{error}</Text>}

          {!loading && !error && recommendations.length === 0 && interests.length > 0 && (
            <Text style={styles.emptyText}>Aucune recommandation pour le moment.</Text>
          )}

          {!loading && !error && recommendations.length === 0 && interests.length === 0 && (
            <Text style={styles.emptyText}>Sélectionnez vos centres d&apos;intérêt pour obtenir des recommandations.</Text>
          )}

          {!loading && !error && (
            <FlatList
              data={recommendations}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Link href={`/activity/${item.id}`} asChild>
                  <Pressable style={styles.activityCard}>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>{item.name}</Text>
                      <Text style={styles.activityCategory}>{getCategoryName(item.category)}</Text>
                      {item.city && (
                        <View style={styles.locationContainer}>
                          <MapPin size={12} color="#64748b" />
                          <Text style={styles.activityCity}>{item.city}</Text>
                        </View>
                      )}
                      <Text numberOfLines={2} style={styles.activityDescription}>{item.description}</Text>
                    </View>
                  </Pressable>
                </Link>
              )}
              scrollEnabled={false}
              numColumns={1}
            />
          )}
        </View>

        <View style={styles.activitiesSection}>
          <Text style={styles.sectionTitle}>Toutes les activités</Text>

          {activitiesLoading && <ActivityIndicator size="large" color="#3b82f6" style={styles.loader} />}

          {!activitiesLoading && (
            <FlatList
              data={activities}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <Link href={`/activity/${item.id}`} asChild>
                  <Pressable style={styles.activityCard}>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>{item.name}</Text>
                      <Text style={styles.activityCategory}>{getCategoryName(item.category)}</Text>
                      {item.city && (
                        <View style={styles.locationContainer}>
                          <MapPin size={12} color="#64748b" />
                          <Text style={styles.activityCity}>{item.city}</Text>
                        </View>
                      )}
                      <Text numberOfLines={2} style={styles.activityDescription}>{item.description}</Text>
                    </View>
                  </Pressable>
                </Link>
              )}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 25,
    paddingBottom: 100,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f4a261',
    marginBottom: 24,
    textAlign: 'center',
  },
  recommendationsContainer: {
    marginBottom: 32,
  },
  recommendationsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  loader: {
    marginVertical: 20,
  },
  errorText: {
    color: '#ef4444',
    marginVertical: 10,
    textAlign: 'center',
  },
  emptyText: {
    color: '#64748b',
    marginVertical: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  activitiesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 12,
  },
  activityCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  activityInfo: {
    padding: 12,
  },
  activityName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activityCategory: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  activityCity: {
    fontSize: 12,
    color: '#64748b',
  },
  activityDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
});
