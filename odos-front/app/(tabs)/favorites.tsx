import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { MapPin, Heart } from 'lucide-react-native';
import { ApiActivity } from '@/types';
import { fetchActivities, fetchFavoriteIds } from '@/scripts/api';

const getCategoryName = (cat: ApiActivity['category']): string => {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object' && 'name' in cat) return cat.name;
  return '';
};

export default function FavoritesScreen() {
  const [activities, setActivities] = useState<ApiActivity[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([fetchActivities(), fetchFavoriteIds()])
      .then(([acts, favIds]) => {
        if (!isMounted) return;
        setActivities(acts);
        setFavoriteIds(favIds);
      })
      .catch((err) => {
        console.error('[Favorites] Erreur chargement favoris:', err);
        if (!isMounted) return;
        setError("Impossible de charger vos activités favorites.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const favoriteActivities = useMemo(
    () => activities.filter((a) => favoriteIds.includes(a.id)),
    [activities, favoriteIds]
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes favoris</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {!error && favoriteActivities.length === 0 && (
        <View style={styles.emptyContainer}>
          <Heart size={32} color="#e5e7eb" />
          <Text style={styles.emptyTitle}>Aucune activité favorite pour le moment</Text>
          <Text style={styles.emptySubtitle}>
            Ajoutez des activités en favoris depuis les listes et les détails pour les retrouver ici.
          </Text>
        </View>
      )}

      {!error && favoriteActivities.length > 0 && (
        <FlatList
          data={favoriteActivities}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Link href={`/activity/${item.id}`} asChild>
              <Pressable style={styles.activityCard}>
                <View style={styles.activityInfo}>
                  <View style={styles.activityHeaderRow}>
                    <Text style={styles.activityName}>{item.name}</Text>
                    <Heart size={18} color="#f97316" />
                  </View>
                  <Text style={styles.activityCategory}>{getCategoryName(item.category)}</Text>
                  {item.city && (
                    <View style={styles.locationContainer}>
                      <MapPin size={12} color="#64748b" />
                      <Text style={styles.activityCity}>{item.city}</Text>
                    </View>
                  )}
                  <Text numberOfLines={2} style={styles.activityDescription}>
                    {item.description}
                  </Text>
                </View>
              </Pressable>
            </Link>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingTop: 25,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
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
  activityHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  activityName: {
    fontSize: 16,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  activityCategory: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 6,
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
  errorText: {
    color: '#ef4444',
    marginHorizontal: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

