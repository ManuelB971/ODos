import { View, Text, StyleSheet, ActivityIndicator, FlatList, Pressable } from 'react-native';
import { Link } from 'expo-router';
import { MapPin, Heart } from 'lucide-react-native';
import { ApiActivity } from '@/types';
import { useFavorites } from '@/hooks/useFavorites';
import { Colors, Spacing } from '@/constants/theme';
import { toAppError } from '@/utils/errorHandling';

const getCategoryName = (cat: ApiActivity['category']): string => {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object' && 'name' in cat) return cat.name;
  return '';
};

export default function FavoritesScreen() {
  const { favorites, isLoading, error } = useFavorites();
  const errorMessage = error ? toAppError(error, 'Impossible de charger vos activites favorites.').userMessage : null;

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes favoris</Text>

      {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

      {!errorMessage && favorites.length === 0 && (
        <View style={styles.emptyContainer}>
          <Heart size={32} color="#e5e7eb" />
          <Text style={styles.emptyTitle}>Aucune activité favorite pour le moment</Text>
          <Text style={styles.emptySubtitle}>
            Ajoutez des activités en favoris depuis les listes et les détails pour les retrouver ici.
          </Text>
        </View>
      )}

      {!errorMessage && favorites.length > 0 && (
        <FlatList
          data={favorites}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Link href={`/activity/${item.id}`} asChild>
              <Pressable style={styles.activityCard}>
                <View style={styles.activityInfo}>
                  <View style={styles.activityHeaderRow}>
                    <Text style={styles.activityName}>{item.name}</Text>
                    <Heart size={18} color={Colors.light.accent} />
                  </View>
                  <Text style={styles.activityCategory}>{getCategoryName(item.category)}</Text>
                  {item.city && (
                    <View style={styles.locationContainer}>
                      <MapPin size={12} color={Colors.light.muted} />
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
    backgroundColor: Colors.light.background,
    paddingTop: 25,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    paddingHorizontal: Spacing.lg,
    marginBottom: 16,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
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
    color: Colors.light.muted,
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
    color: Colors.light.muted,
  },
  activityDescription: {
    fontSize: 13,
    color: Colors.light.muted,
    lineHeight: 18,
  },
  errorText: {
    color: Colors.light.danger,
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
    color: Colors.light.text,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});

