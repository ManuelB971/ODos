import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Image,
  ScrollView,
} from 'react-native';
import { MapPin as MapPinIcon, Star, ArrowRight } from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useInterests } from '@/context/InterestContext';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useActivities } from '@/hooks/useActivities';
import { ApiActivity } from '@/types';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { BrandBaseline } from '@/components/BrandBaseline';
import { BRAND_TAGLINE } from '@/constants/brand';
import { toAppError } from '@/utils/errorHandling';
import { AppLogo } from '@/components/AppLogo';
import { resolveImageUrl } from '@/utils/imageUrl';
import { lngDeltaToZoom } from '@/utils/mapViewport';
import { MapPin as MapPinMarker } from '@/components/map/MapPin';
import { SkeletonActivityRow, SkeletonRecommendationCard } from '@/components/ui/Skeleton';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import { getOdosMaplibreStyleUrl } from '@/constants/maplibreStyle';

/** Helper: get the category display name from the API response */
const getCategoryName = (cat: ApiActivity['category']): string => {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object' && 'name' in cat) return cat.name;
  return '';
};

const formatPrice = (price: number | null | undefined): string => {
  if (price == null) return '';
  if (price === 0) return 'Gratuit';
  return `À partir de ${Math.round(price)}€`;
};

/** Carte verticale horizontale (liste "Toutes les activités") — image arrondie + infos. */
function ActivityRow({ item }: { item: ApiActivity }) {
  const img = resolveImageUrl(item.imageUrl);
  const priceLabel = formatPrice(item.price);
  return (
    <Link href={`/activity/${item.id}`} asChild>
      <Pressable style={styles.rowCard} android_ripple={{ color: '#00000010' }}>
        {img ? (
          <Image source={{ uri: img }} style={styles.rowImage} resizeMode="cover" />
        ) : (
          <View style={[styles.rowImage, styles.rowImagePlaceholder]} />
        )}
        <View style={styles.rowInfo}>
          <View style={styles.rowTopLine}>
            <Text numberOfLines={1} style={styles.rowCategory}>
              {getCategoryName(item.category).toUpperCase()}
            </Text>
            {priceLabel ? <Text style={styles.rowPrice}>{priceLabel}</Text> : null}
          </View>
          <Text numberOfLines={1} style={styles.rowName}>{item.name}</Text>
          {item.city ? (
            <View style={styles.rowMetaLine}>
              <MapPinIcon size={11} color={Colors.light.muted} />
              <Text style={styles.rowMeta}>{item.city}</Text>
            </View>
          ) : null}
          <Text numberOfLines={2} style={styles.rowDescription}>{item.description}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

/** Grande carte "Recommandation" (carrousel horizontal) — grosse image + badge note + texte. */
function RecommendationCard({ item }: { item: ApiActivity }) {
  const img = resolveImageUrl(item.imageUrl);
  const rating = item.ratingAverage;
  return (
    <Link href={`/activity/${item.id}`} asChild>
      <Pressable style={styles.recoCard} android_ripple={{ color: '#00000010' }}>
        <View style={styles.recoImageWrap}>
          {img ? (
            <Image source={{ uri: img }} style={styles.recoImage} resizeMode="cover" />
          ) : (
            <View style={[styles.recoImage, styles.recoImagePlaceholder]} />
          )}
          {rating != null && rating > 0 ? (
            <View style={styles.recoBadge}>
              <Star size={12} color="#fff" fill="#fff" />
              <Text style={styles.recoBadgeText}>{rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.recoBody}>
          {item.city ? (
            <View style={styles.rowMetaLine}>
              <MapPinIcon size={11} color={Colors.light.muted} />
              <Text style={styles.recoCity}>{item.city.toUpperCase()}</Text>
            </View>
          ) : null}
          <Text numberOfLines={1} style={styles.recoName}>{item.name}</Text>
          <Text numberOfLines={2} style={styles.recoDescription}>{item.description}</Text>
        </View>
      </Pressable>
    </Link>
  );
}

/**
 * Nombre max d'activités affichées dans la section "Toutes les activités" de la home.
 * Au-delà, l'utilisateur bascule vers `/search` via le bouton "Voir tout".
 */
const HOME_ACTIVITIES_LIMIT = 5;

export default function HomeScreen() {
  const { interests } = useInterests();
  const { recommendations, loading, error } = useRecommendations(interests);
  const activitiesQuery = useActivities();
  const rawActivities = useMemo(() => activitiesQuery.data ?? [], [activitiesQuery.data]);
  const activitiesError = activitiesQuery.error
    ? toAppError(activitiesQuery.error, 'Impossible de charger les activites.').userMessage
    : null;
  const router = useRouter();

  /**
   * Côté back, l'extension `ActivityPublishedExtension` filtre déjà les brouillons
   * pour les non-admins. On re-filtre côté client pour que les admins connectés ne
   * voient pas non plus les brouillons sur le feed public (home + map).
   */
  const activities = useMemo(
    () => rawActivities.filter((a) => a.isPublished !== false),
    [rawActivities],
  );

  const geoActivities = useMemo(
    () => activities.filter((a) => a.latitude != null && a.longitude != null),
    [activities],
  );

  /** Extrait limité à HOME_ACTIVITIES_LIMIT éléments pour la liste de la home. */
  const homeActivities = useMemo(
    () => activities.slice(0, HOME_ACTIVITIES_LIMIT),
    [activities],
  );
  const hasMoreActivities = activities.length > HOME_ACTIVITIES_LIMIT;

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
        data={homeActivities}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ActivityRow item={item} />}
        ListFooterComponent={
          hasMoreActivities ? (
            <Pressable
              onPress={() => router.push('/search')}
              style={styles.seeMoreBtn}
              accessibilityRole="button"
              accessibilityLabel="Voir toutes les activités"
            >
              <Text style={styles.seeMoreText}>
                Voir les {activities.length - HOME_ACTIVITIES_LIMIT} autres
              </Text>
              <ArrowRight size={14} color={Colors.light.primary} />
            </Pressable>
          ) : null
        }
        ListHeaderComponent={
          <View>
            <View style={styles.logoWrap}>
              <AppLogo width={64} height={64} />
            </View>
            <BrandBaseline variant="short" style={styles.heroBaseline} />
            <Text style={styles.welcomeText}>Bienvenue sur ODOS</Text>
            <Text style={styles.welcomeSubtitle}>{BRAND_TAGLINE.toUpperCase()}</Text>

            {/* ── Carte des activités (preview + CTA vers /map) ── */}
            <View style={styles.mapSection}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Carte des activités</Text>
                <Pressable onPress={() => router.push('/map')} hitSlop={8}>
                  <Text style={styles.seeAllText}>EXPLORER</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() => router.push('/map')}
                style={styles.mapContainer}
                accessibilityRole="button"
                accessibilityLabel="Ouvrir la carte immersive"
              >
                <Map
                  key={`hm-${initialRegion.latitude.toFixed(4)}_${initialRegion.longitude.toFixed(4)}_${geoActivities.length}`}
                  style={styles.map}
                  mapStyle={getOdosMaplibreStyleUrl()}
                  pointerEvents="none"
                  attribution
                  logo
                  compass={false}
                  scaleBar={false}
                  dragPan={false}
                  touchZoom={false}
                  doubleTapZoom={false}
                  doubleTapHoldZoom={false}
                  touchRotate={false}
                  touchPitch={false}
                >
                  <Camera
                    initialViewState={{
                      center: [initialRegion.longitude, initialRegion.latitude],
                      zoom: lngDeltaToZoom(initialRegion.longitudeDelta),
                    }}
                  />
                  {geoActivities.slice(0, 40).map((activity) => (
                    <Marker
                      key={`marker-${activity.id}`}
                      id={`hm-${activity.id}`}
                      lngLat={[activity.longitude, activity.latitude]}
                      anchor="bottom"
                    >
                      <MapPinMarker variant="dot" />
                    </Marker>
                  ))}
                </Map>
                <View pointerEvents="none" style={styles.mapBadgeCount}>
                  <Text style={styles.mapBadgeCountText}>
                    {geoActivities.length} lieu{geoActivities.length > 1 ? 'x' : ''}
                  </Text>
                </View>
                <View pointerEvents="none" style={styles.mapCta}>
                  <Text style={styles.mapCtaText}>Explorer la carte</Text>
                  <ArrowRight size={14} color="#fff" />
                </View>
              </Pressable>
            </View>

            {/* ── Recommandations (carrousel horizontal) ── */}
            <View style={styles.recommendationsContainer}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Recommandations</Text>
                {recommendations.length > 0 ? (
                  <Pressable onPress={() => router.push('/search')}>
                    <Text style={styles.seeAllText}>VOIR TOUT</Text>
                  </Pressable>
                ) : null}
              </View>
              {loading && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recoScroller}
                >
                  <SkeletonRecommendationCard />
                  <SkeletonRecommendationCard />
                  <SkeletonRecommendationCard />
                </ScrollView>
              )}
              {error && <Text style={styles.errorText}>{error}</Text>}
              {!loading && !error && recommendations.length === 0 && interests.length > 0 && (
                <Text style={styles.emptyText}>Aucune recommandation pour le moment.</Text>
              )}
              {!loading && !error && recommendations.length === 0 && interests.length === 0 && (
                <Text style={styles.emptyText}>Sélectionnez vos centres d&apos;intérêt pour obtenir des recommandations.</Text>
              )}
              {!loading && !error && recommendations.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recoScroller}
                >
                  {recommendations.map((item) => (
                    <RecommendationCard key={`rec-${item.id}`} item={item} />
                  ))}
                </ScrollView>
              )}
            </View>

            <View style={[styles.sectionHeaderRow, styles.sectionTitleSpaced]}>
              <Text style={styles.sectionTitle}>Toutes les activités</Text>
              {hasMoreActivities ? (
                <Pressable onPress={() => router.push('/search')} hitSlop={8}>
                  <Text style={styles.seeAllText}>VOIR TOUT</Text>
                </Pressable>
              ) : null}
            </View>
            {activitiesQuery.isLoading && (
              <View style={styles.skeletonListWrap}>
                <SkeletonActivityRow />
                <SkeletonActivityRow />
                <SkeletonActivityRow />
              </View>
            )}
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
    fontFamily: FontFamily.display,
    color: Colors.light.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 11,
    fontFamily: FontFamily.uiMedium,
    letterSpacing: 1.5,
    color: Colors.light.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: 8,
  },
  heroBaseline: {
    fontSize: 16,
    marginBottom: 8,
  },
  recommendationsContainer: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    color: Colors.light.primary,
    fontSize: 12,
    fontFamily: FontFamily.uiBold,
    letterSpacing: 1,
  },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.elevated,
  },
  seeMoreText: {
    color: Colors.light.primary,
    fontFamily: FontFamily.uiBold,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  loader: {
    marginVertical: 20,
  },
  skeletonListWrap: {
    gap: 4,
    marginBottom: 20,
  },
  errorText: {
    color: Colors.light.danger,
    marginVertical: 10,
    textAlign: 'center',
  },
  emptyText: {
    color: Colors.light.muted,
    fontFamily: FontFamily.ui,
    marginVertical: 10,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  mapSection: {
    marginBottom: 24,
  },
  mapContainer: {
    borderRadius: Radius.card,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    backgroundColor: Colors.light.surface,
    position: 'relative',
  },
  map: {
    width: '100%',
    height: 240,
  },
  mapBadgeCount: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: `${Colors.light.elevated}F5`,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  mapBadgeCountText: {
    fontSize: 12,
    fontFamily: FontFamily.uiBold,
    color: Colors.light.text,
    letterSpacing: 0.4,
  },
  mapCta: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.light.mapPrimaryCta,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  mapCtaText: {
    color: '#fff',
    fontFamily: FontFamily.uiBold,
    fontSize: 13,
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FontFamily.display,
    color: Colors.light.text,
    marginBottom: 12,
  },
  sectionTitleSpaced: {
    marginTop: 8,
  },

  // ── Recommandation card (carrousel horizontal) ──
  recoScroller: {
    paddingRight: 8,
  },
  recoCard: {
    width: 260,
    marginRight: 14,
    borderRadius: Radius.card,
    backgroundColor: Colors.light.elevated,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  recoImageWrap: {
    position: 'relative',
    width: '100%',
    height: 160,
  },
  recoImage: {
    width: '100%',
    height: '100%',
  },
  recoImagePlaceholder: {
    backgroundColor: Colors.light.surface,
  },
  recoBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  recoBadgeText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 12,
  },
  recoBody: {
    padding: 12,
  },
  recoCity: {
    fontSize: 11,
    fontFamily: FontFamily.uiMedium,
    color: Colors.light.muted,
    letterSpacing: 0.5,
  },
  recoName: {
    fontSize: 16,
    fontFamily: FontFamily.uiBold,
    color: Colors.light.text,
    marginTop: 4,
    marginBottom: 4,
  },
  recoDescription: {
    fontSize: 12,
    fontFamily: FontFamily.ui,
    color: Colors.light.muted,
    fontStyle: 'italic',
    lineHeight: 16,
  },

  // ── Row card (liste verticale "Toutes les activités") ──
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: Colors.light.elevated,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  rowImage: {
    width: 76,
    height: 76,
    borderRadius: 38,
    marginRight: 12,
  },
  rowImagePlaceholder: {
    backgroundColor: Colors.light.surface,
  },
  rowInfo: {
    flex: 1,
    minWidth: 0,
  },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
    gap: 8,
  },
  rowCategory: {
    fontSize: 10,
    fontFamily: FontFamily.uiBold,
    color: Colors.light.muted,
    letterSpacing: 0.7,
    flexShrink: 1,
  },
  rowPrice: {
    fontSize: 11,
    fontFamily: FontFamily.uiBold,
    color: Colors.light.accent,
  },
  rowName: {
    fontSize: 15,
    fontFamily: FontFamily.uiBold,
    color: Colors.light.text,
    marginBottom: 2,
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  rowMeta: {
    fontSize: 11,
    fontFamily: FontFamily.ui,
    color: Colors.light.muted,
  },
  rowDescription: {
    fontSize: 12,
    fontFamily: FontFamily.ui,
    color: Colors.light.muted,
    lineHeight: 16,
  },
});
