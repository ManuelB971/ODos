import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Image,
  ImageBackground,
  ScrollView,
} from 'react-native';
import { ArrowRight, MapPin as MapPinIcon } from 'lucide-react-native';
import { DaIcon } from '@/components/ui/DaIcon';
import { Link, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { useInterests } from '@/context/InterestContext';
import { useRecommendations } from '@/hooks/useRecommendations';
import { useActivities } from '@/hooks/useActivities';
import { ApiActivity } from '@/types';
import { FontFamily, Radius, Spacing } from '@/constants/theme';
import { useOdosColors, useTheme, type OdosColorPalette } from '@/context/ThemeContext';
import { BrandBaseline } from '@/components/BrandBaseline';
import { BRAND_TAGLINE } from '@/constants/brand';
import { toAppError } from '@/utils/errorHandling';
import { AppLogo } from '@/components/AppLogo';
import { resolveImageUrl } from '@/utils/imageUrl';
import { lngDeltaToZoom } from '@/utils/mapViewport';
import { MapPin as MapPinMarker } from '@/components/map/MapPin';
import { SkeletonActivityRow, SkeletonRecommendationCard } from '@/components/ui/Skeleton';
import { CTAButton } from '@/components/ui/CTAButton';
import { MosaicPopCard, MosaicPopRow } from '@/components/cards/MosaicPopCard';
import { MosaicPopMap } from '@/components/cards/MosaicPopMap';
import { Map, Camera, Marker } from '@maplibre/maplibre-react-native';
import { getOdosMaplibreStyleUrl } from '@/constants/maplibreStyle';

/** Helper: get the category display name from the API response */
const getCategoryName = (cat: ApiActivity['category']): string => {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object' && 'name' in cat) return cat.name;
  return '';
};

/** Accent par catégorie — uniquement les tokens DA officiels : orange, teal, bleu action. */
const CATEGORY_ACCENTS = ['#F4A261', '#5FC2D8', '#3B82F6', '#E07D3A'];
const getCategoryAccent = (name: string): string => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return CATEGORY_ACCENTS[Math.abs(h) % CATEGORY_ACCENTS.length];
};

const formatPrice = (price: number | null | undefined): string => {
  if (price == null) return '';
  if (price === 0) return 'Gratuit';
  return `À partir de ${Math.round(price)}€`;
};

/** Carte verticale horizontale (liste "Toutes les activités") — image arrondie + infos. */
function ActivityRow({ item }: { item: ApiActivity }) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
              <MapPinIcon size={11} color={colors.muted} />
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
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const img = resolveImageUrl(item.imageUrl);
  const rating = item.ratingAverage;
  const categoryName = getCategoryName(item.category);
  const accent = getCategoryAccent(categoryName);

  return (
    <Link href={`/activity/${item.id}`} asChild>
      <Pressable style={styles.recoCard} android_ripple={{ color: '#00000008' }}>
        {/* Accent bar top */}
        <View style={[styles.recoAccentBar, { backgroundColor: accent }]} />

        {/* Image */}
        <View style={styles.recoImageWrap}>
          {img ? (
            <Image source={{ uri: img }} style={styles.recoImage} resizeMode="cover" />
          ) : (
            <View style={[styles.recoImage, styles.recoImagePlaceholder, { backgroundColor: `${accent}22` }]} />
          )}
          {/* Rating — top right, gold pill */}
          {rating != null && rating > 0 ? (
            <View style={styles.recoBadge}>
              <Text style={styles.recoBadgeText}>★ {rating.toFixed(1)}</Text>
            </View>
          ) : null}
        </View>

        {/* Body */}
        <View style={styles.recoBody}>
          {item.city ? (
            <View style={styles.rowMetaLine}>
              <MapPinIcon size={11} color={accent} />
              <Text style={[styles.recoCity, { color: accent }]}>{item.city}</Text>
            </View>
          ) : null}
          <Text numberOfLines={2} style={styles.recoName}>{item.name}</Text>
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

const SPRAY_BG = require('@/assets/images/spray-background.png');

export default function HomeScreen() {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { sprayOpacity, cardStyle, colorScheme } = useTheme();
  const { interests } = useInterests();
  const { recommendations, loading, error, refresh } = useRecommendations(interests);
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

  /** Activités les mieux notées : triées par note décroissante, top 10. */
  const topRated = useMemo(
    () =>
      activities
        .filter((a) => typeof a.ratingAverage === 'number' && a.ratingAverage > 0)
        .sort((a, b) => (b.ratingAverage ?? 0) - (a.ratingAverage ?? 0))
        .slice(0, 10),
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
    <ImageBackground
      source={SPRAY_BG}
      style={styles.container}
      imageStyle={[styles.bgSpray, { opacity: sprayOpacity }]}
      resizeMode="cover"
    >
      <FlatList
        data={homeActivities}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) =>
          cardStyle === 'mosaicPop' ? <MosaicPopRow item={item} /> : <ActivityRow item={item} />
        }
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
              <ArrowRight size={14} color={colors.primary} />
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
              {cardStyle === 'mosaicPop' ? (
                <MosaicPopMap
                  count={geoActivities.length}
                  onPress={() => router.push('/map')}
                />
              ) : (
              <Pressable
                onPress={() => router.push('/map')}
                style={styles.mapContainer}
                accessibilityRole="button"
                accessibilityLabel="Ouvrir la carte immersive"
              >
                <Map
                  key={`hm-${colorScheme}-${initialRegion.latitude.toFixed(4)}_${initialRegion.longitude.toFixed(4)}_${geoActivities.length}`}
                  style={styles.map}
                  mapStyle={getOdosMaplibreStyleUrl(colorScheme)}
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
                  <DaIcon name="carte" variant="cta" accessibilityLabel="Carte" />
                  <Text style={styles.mapCtaText}>Explorer la carte</Text>
                </View>
              </Pressable>
              )}
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
              {error && (
                <View style={styles.recoState}>
                  <Text style={styles.errorText}>{error}</Text>
                  <CTAButton label="Réessayer" size="sm" variant="secondary" onPress={() => refresh()} />
                </View>
              )}
              {!loading && !error && recommendations.length === 0 && interests.length > 0 && (
                <Text style={styles.emptyText}>Aucune recommandation pour le moment.</Text>
              )}
              {!loading && !error && recommendations.length === 0 && interests.length === 0 && (
                <View style={styles.recoState}>
                  <Text style={[styles.emptyText, styles.emptyWarm]}>Dites-nous ce que vous aimez, on s&apos;occupe du reste.</Text>
                  <CTAButton label="Choisir mes intérêts" size="sm" onPress={() => router.push('/interests')} />
                </View>
              )}
              {!loading && !error && recommendations.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recoScroller}
                >
                  {recommendations.map((item) =>
                    cardStyle === 'mosaicPop' ? (
                      <MosaicPopCard key={`rec-${item.id}`} item={item} />
                    ) : (
                      <RecommendationCard key={`rec-${item.id}`} item={item} />
                    )
                  )}
                </ScrollView>
              )}
            </View>

            {/* ── Activités les mieux notées (carrousel horizontal) ── */}
            {topRated.length > 0 ? (
              <View style={styles.recommendationsContainer}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Activités les mieux notées</Text>
                  <Pressable onPress={() => router.push('/search')}>
                    <Text style={styles.seeAllText}>VOIR TOUT</Text>
                  </Pressable>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.recoScroller}
                >
                  {topRated.map((item) =>
                    cardStyle === 'mosaicPop' ? (
                      <MosaicPopCard key={`top-${item.id}`} item={item} />
                    ) : (
                      <RecommendationCard key={`top-${item.id}`} item={item} />
                    )
                  )}
                </ScrollView>
              </View>
            ) : null}

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
    </ImageBackground>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bgSpray: {
    // opacity set inline to vary by theme (isDark)
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 25,
    paddingBottom: 100,
  },
  welcomeText: {
    fontSize: 28,
    fontFamily: FontFamily.display,
    color: colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 11,
    fontFamily: FontFamily.uiMedium,
    letterSpacing: 1.5,
    color: colors.muted,
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
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAllText: {
    color: colors.primary,
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
    borderColor: colors.border,
    backgroundColor: colors.elevated,
  },
  seeMoreText: {
    color: colors.primary,
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
  recoState: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },
  emptyWarm: {
    fontFamily: FontFamily.accent,
    fontSize: 16,
  },
  errorText: {
    color: colors.danger,
    marginVertical: 10,
    textAlign: 'center',
  },
  emptyText: {
    color: colors.muted,
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
    backgroundColor: colors.surface,
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
    backgroundColor: `${colors.elevated}F5`,
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
    color: colors.text,
    letterSpacing: 0.4,
  },
  mapCta: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    backgroundColor: colors.mapPrimaryCta,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 3,
  },
  mapCtaText: {
    color: colors.onAccent,
    fontFamily: FontFamily.uiBold,
    fontSize: 14,
    letterSpacing: 0.3,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: FontFamily.display,
    color: colors.text,
    marginBottom: 12,
  },
  sectionTitleSpaced: {
    marginTop: 8,
  },

  // ── Recommandation card (carrousel horizontal) ──
  recoScroller: {
    paddingRight: 8,
    paddingTop: 4,
    paddingBottom: 18,
  },
  recoCard: {
    width: 250,
    marginRight: 14,
    borderRadius: 20,
    backgroundColor: colors.elevated,
    overflow: 'hidden',
    shadowColor: '#F4A261',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 5,
  },
  recoAccentBar: {
    height: 4,
    width: '100%',
  },
  recoImageWrap: {
    position: 'relative',
    width: '100%',
    height: 155,
  },
  recoImage: {
    width: '100%',
    height: '100%',
  },
  recoImagePlaceholder: {
    backgroundColor: colors.surface,
  },
  recoBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFD54F',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
  },
  recoBadgeText: {
    color: '#E07D3A',
    fontFamily: FontFamily.uiBold,
    fontSize: 12,
  },
  recoBody: {
    padding: 12,
    paddingTop: 10,
  },
  recoCity: {
    fontSize: 11,
    fontFamily: FontFamily.uiMedium,
    letterSpacing: 0.4,
  },
  recoName: {
    fontSize: 15,
    fontFamily: FontFamily.uiBold,
    color: colors.text,
    marginTop: 3,
    lineHeight: 20,
  },
  recoDescription: {
    fontSize: 12,
    fontFamily: FontFamily.ui,
    color: colors.muted,
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
    backgroundColor: colors.elevated,
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
    backgroundColor: colors.surface,
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
    color: colors.muted,
    letterSpacing: 0.7,
    flexShrink: 1,
  },
  rowPrice: {
    fontSize: 11,
    fontFamily: FontFamily.uiBold,
    color: colors.accent,
  },
  rowName: {
    fontSize: 15,
    fontFamily: FontFamily.uiBold,
    color: colors.text,
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
    color: colors.muted,
  },
  rowDescription: {
    fontSize: 12,
    fontFamily: FontFamily.ui,
    color: colors.muted,
    lineHeight: 16,
  },
});
}
