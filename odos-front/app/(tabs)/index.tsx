import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator, Platform } from 'react-native';
import { MapPin } from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useInterests } from '@/context/InterestContext';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useActivities } from '@/hooks/useActivities';
import { ApiActivity } from '@/types';
import { Colors, Spacing } from '@/constants/theme';
import { toAppError } from '@/utils/errorHandling';
import { AppLogo } from '@/components/AppLogo';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

/** Helper: get the category display name from the API response */
const getCategoryName = (cat: ApiActivity['category']): string => {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object' && 'name' in cat) return cat.name;
  return '';
};

export default function HomeScreen() {
  const { interests } = useInterests();
  const { recommendations, loading, error } = useRecommendations(interests);
  const activitiesQuery = useActivities();
  const activities = useMemo(() => activitiesQuery.data ?? [], [activitiesQuery.data]);
  const activitiesError = activitiesQuery.error
    ? toAppError(activitiesQuery.error, 'Impossible de charger les activites.').userMessage
    : null;
  const router = useRouter();

  const geoActivities = useMemo(
    () => activities.filter((a) => a.latitude != null && a.longitude != null),
    [activities],
  );

  const initialRegion = useMemo(() => {
    if (geoActivities.length === 0) {
      return { latitude: 46.603354, longitude: 1.888334, latitudeDelta: 6, longitudeDelta: 6 };
    }
    const lats = geoActivities.map((a) => a.latitude);
    const lngs = geoActivities.map((a) => a.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.3, 0.05),
      longitudeDelta: Math.max((maxLng - minLng) * 1.3, 0.05),
    };
  }, [geoActivities]);

  return (
    <View style={styles.container}>
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
                    <MapPin size={12} color={Colors.light.muted} />
                    <Text style={styles.activityCity}>{item.city}</Text>
                  </View>
                )}
                <Text numberOfLines={2} style={styles.activityDescription}>{item.description}</Text>
              </View>
            </Pressable>
          </Link>
        )}
        ListHeaderComponent={
          <View>
            <View style={styles.logoWrap}>
              <AppLogo width={64} height={64} />
            </View>
            <Text style={styles.welcomeText}>Bienvenue sur ODOS</Text>

            {/* ── Carte des activités ── */}
            <View style={styles.mapSection}>
              <Text style={styles.sectionTitle}>Carte des activites</Text>
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  initialRegion={initialRegion}
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                >
                  {geoActivities.map((activity) => (
                    <Marker
                      key={`marker-${activity.id}`}
                      coordinate={{ latitude: activity.latitude, longitude: activity.longitude }}
                      title={activity.name}
                      description={activity.city ?? undefined}
                      onCalloutPress={() => router.push(`/activity/${activity.id}`)}
                    />
                  ))}
                </MapView>
              </View>
            </View>

            <View style={styles.recommendationsContainer}>
              <Text style={styles.recommendationsTitle}>Recommandations</Text>
              {loading && <ActivityIndicator size="large" color={Colors.light.primary} style={styles.loader} />}
              {error && <Text style={styles.errorText}>{error}</Text>}
              {!loading && !error && recommendations.length === 0 && interests.length > 0 && (
                <Text style={styles.emptyText}>Aucune recommandation pour le moment.</Text>
              )}
              {!loading && !error && recommendations.length === 0 && interests.length === 0 && (
                <Text style={styles.emptyText}>Selectionnez vos centres d&apos;interet pour obtenir des recommandations.</Text>
              )}
              {!loading && !error && recommendations.map((item) => (
                <Link key={`rec-${item.id}`} href={`/activity/${item.id}`} asChild>
                  <Pressable style={styles.activityCard}>
                    <View style={styles.activityInfo}>
                      <Text style={styles.activityName}>{item.name}</Text>
                      <Text style={styles.activityCategory}>{getCategoryName(item.category)}</Text>
                      {item.city && (
                        <View style={styles.locationContainer}>
                          <MapPin size={12} color={Colors.light.muted} />
                          <Text style={styles.activityCity}>{item.city}</Text>
                        </View>
                      )}
                      <Text numberOfLines={2} style={styles.activityDescription}>{item.description}</Text>
                    </View>
                  </Pressable>
                </Link>
              ))}
            </View>
            <Text style={styles.sectionTitle}>Toutes les activites</Text>
            {activitiesQuery.isLoading && <ActivityIndicator size="large" color={Colors.light.primary} style={styles.loader} />}
            {activitiesError && <Text style={styles.errorText}>{activitiesError}</Text>}
          </View>
        }
        contentContainerStyle={styles.scrollContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 25,
    paddingBottom: 100,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.light.accent,
    marginBottom: 24,
    textAlign: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  recommendationsContainer: {
    marginBottom: 32,
  },
  recommendationsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 12,
  },
  loader: {
    marginVertical: 20,
  },
  errorText: {
    color: Colors.light.danger,
    marginVertical: 10,
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.light.muted,
    marginVertical: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  mapSection: {
    marginBottom: 24,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  map: {
    width: '100%',
    height: 220,
  },
  activitiesSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 12,
  },
  activityCard: {
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: Colors.light.background,
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
    color: Colors.light.muted,
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
    color: Colors.light.muted,
  },
  activityDescription: {
    fontSize: 13,
    color: Colors.light.muted,
    lineHeight: 18,
  },
});
