import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { MapPin, ArrowLeft, Heart } from 'lucide-react-native';
import { useState, useEffect } from 'react';
import api, { fetchFavoriteIds, toggleFavoriteActivity } from '@/scripts/api';
import { ApiActivity } from '@/types';
import { Colors, Spacing } from '@/constants/theme';
import { logError, toAppError } from '@/utils/errorHandling';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';

/** Expo Router peut fournir `id` comme string ou string[] */
function routeParamToString(param: string | string[] | undefined): string | undefined {
  if (param === undefined) return undefined;
  return Array.isArray(param) ? param[0] : param;
}

/** Helper: get the category display name from the API response */
const getCategoryName = (cat: ApiActivity['category']): string => {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object' && 'name' in cat) return cat.name;
  return '';
};

export default function ActivityDetails() {
  const { id } = useLocalSearchParams();
  const { isAuthenticated } = useAuth();
  const [activity, setActivity] = useState<ApiActivity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const idFromRoute = routeParamToString(id as string | string[] | undefined);
  const activityIdFromRoute = Number.parseInt(String(idFromRoute ?? ''), 10);
  const activityId =
    activity?.id ??
    (Number.isFinite(activityIdFromRoute) && activityIdFromRoute > 0 ? activityIdFromRoute : NaN);

  const favoriteIdsQuery = useQuery<number[]>({
    queryKey: ['favoriteIds'],
    queryFn: fetchFavoriteIds,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 10,
    retry: 1,
  });

  const toggleFavoriteMutation = useMutation({
    mutationFn: ({ targetActivityId, currentlyFavorite }: { targetActivityId: number; currentlyFavorite: boolean }) =>
      toggleFavoriteActivity(targetActivityId, currentlyFavorite),
    onMutate: async ({ targetActivityId, currentlyFavorite }) => {
      await queryClient.cancelQueries({ queryKey: ['favoriteIds'] });
      const previous = queryClient.getQueryData<number[]>(['favoriteIds']);
      queryClient.setQueryData<number[]>(['favoriteIds'], (old) => {
        const list = old ?? [];
        if (currentlyFavorite) {
          return list.filter((i) => i !== targetActivityId);
        }
        if (list.includes(targetActivityId)) return list;
        return [...list, targetActivityId];
      });
      return { previous };
    },
    onError: (err: unknown, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(['favoriteIds'], context.previous);
      }
      logError('ActivityDetails.toggleFavorite', err, { id: activityId });
      const appError = toAppError(err, 'Impossible de modifier les favoris.');
      Alert.alert('Favoris', appError.userMessage);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['favoriteIds'] });
    },
  });

  const isFavorite =
    isAuthenticated && (favoriteIdsQuery.data ?? []).includes(activityId);

  useEffect(() => {
    const fetchId = idFromRoute ?? String(id);
    if (!fetchId) {
      setLoading(false);
      setError('Activité introuvable');
      return;
    }
    api
      .get(`/api/activities/${fetchId}`)
      .then((res) => setActivity(res.data))
      .catch((err) => {
        logError('ActivityDetails.fetch', err, { id: fetchId });
        setError(toAppError(err, "Impossible de charger l'activite.").userMessage);
      })
      .finally(() => setLoading(false));
  }, [id, idFromRoute]);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </View>
    );
  }

  if (error || !activity) {
    return (
      <View style={styles.container}>
        <Pressable style={styles.backButtonStandalone} onPress={() => router.back()}>
          <ArrowLeft color={Colors.light.text} size={24} />
        </Pressable>
        <Text style={styles.errorText}>{error ?? 'Activité introuvable'}</Text>
      </View>
    );
  }

  const canToggleFavorite = Number.isFinite(activityId) && activityId > 0;

  const onFavoritePress = () => {
    if (!isAuthenticated) {
      Alert.alert('Connexion requise', 'Connectez-vous pour ajouter des favoris.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Se connecter', onPress: () => router.push('/login') },
      ]);
      return;
    }
    if (!canToggleFavorite) return;
    toggleFavoriteMutation.mutate({ targetActivityId: activityId, currentlyFavorite: isFavorite });
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft color={Colors.light.text} size={24} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.favoriteButton, pressed && styles.favoriteButtonPressed]}
          onPress={onFavoritePress}
          disabled={toggleFavoriteMutation.isPending || !canToggleFavorite}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Heart
            color={isFavorite ? Colors.light.danger : Colors.light.primary}
            fill={isFavorite ? Colors.light.danger : 'none'}
            size={24}
          />
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Text style={styles.title}>{activity.name}</Text>

        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{getCategoryName(activity.category)}</Text>
        </View>

        {activity.city && (
          <View style={styles.addressContainer}>
            <MapPin color={Colors.light.muted} size={16} />
            <Text style={styles.address}>{activity.city}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>À propos de cette expérience</Text>
        <Text style={styles.description}>{activity.description}</Text>

        {(activity.latitude && activity.longitude) && (
          <View style={styles.coordsContainer}>
            <MapPin color={Colors.light.primary} size={14} />
            <Text style={styles.coordsText}>
              {activity.latitude.toFixed(4)}, {activity.longitude.toFixed(4)}
            </Text>
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: 48,
    paddingBottom: 12,
  },
  backButton: {
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    padding: 8,
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  backButtonStandalone: {
    padding: Spacing.lg,
    paddingTop: 48,
  },
  favoriteButton: {
    backgroundColor: Colors.light.surface,
    borderRadius: 24,
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.light.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  favoriteButtonPressed: {
    opacity: 0.7,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 12,
  },
  categoryBadge: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  categoryText: {
    color: Colors.light.primary,
    fontWeight: '600',
    fontSize: 14,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  address: {
    color: Colors.light.muted,
    marginLeft: 8,
    flex: 1,
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.light.text,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: Colors.light.muted,
    lineHeight: 24,
    marginBottom: 24,
  },
  coordsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.surface,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  coordsText: {
    fontSize: 13,
    color: Colors.light.muted,
  },
  errorText: {
    fontSize: 18,
    color: Colors.light.danger,
    textAlign: 'center',
    marginTop: 24,
  },
});
