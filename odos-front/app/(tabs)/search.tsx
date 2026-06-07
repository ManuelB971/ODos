import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { ChevronRight, MapPin } from 'lucide-react-native';
import { DaIcon } from '@/components/ui/DaIcon';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { ApiActivity } from '@/types';
import { useActivities } from '@/hooks/useActivities';
import { useDebounce } from '@/hooks/useDebounce';
import { resolveImageUrl } from '@/utils/imageUrl';

/** Palette alignée sur docs/DESIGN_DIRECTION.md */
import { FontFamily } from '@/constants/theme';
import { useOdosColors, type OdosColorPalette } from '@/context/ThemeContext';

const serif = FontFamily.display;
const sans = FontFamily.ui;

const getCategoryName = (cat: ApiActivity['category']): string => {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object' && 'name' in cat) return cat.name;
  return '';
};

function formatPrice(price: number | null): string | null {
  if (price == null || Number.isNaN(price)) return null;
  return `€${Math.round(price)}`;
}

export default function SearchScreen() {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const insets = useSafeAreaInsets();
  const activitiesQuery = useActivities();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChip, setActiveChip] = useState<string>('Tout');
  const debouncedQuery = useDebounce(searchQuery, 250);

  const published = useMemo(() => {
    const raw = activitiesQuery.data ?? [];
    return raw.filter((a) => a.isPublished !== false);
  }, [activitiesQuery.data]);

  const chipOptions = useMemo(() => {
    const names = new Set<string>();
    published.forEach((a) => {
      const n = getCategoryName(a);
      if (n) names.add(n);
    });
    return ['Tout', ...Array.from(names).sort((a, b) => a.localeCompare(b, 'fr'))];
  }, [published]);

  const browseList = useMemo(() => {
    if (activeChip === 'Tout') return published;
    return published.filter((a) => getCategoryName(a) === activeChip);
  }, [published, activeChip]);

  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return browseList;
    return browseList.filter(
      (activity) =>
        activity.name.toLowerCase().includes(q) ||
        getCategoryName(activity.category).toLowerCase().includes(q) ||
        activity.description.toLowerCase().includes(q) ||
        (activity.city ?? '').toLowerCase().includes(q)
    );
  }, [browseList, debouncedQuery]);

  const isSearching = debouncedQuery.trim().length > 0;
  const featured = browseList[0];
  const gridLeft = browseList[1];
  const gridRight = browseList[2];
  const banner = browseList[3];

  const navigateToActivity = (id: number) => {
    router.push(`/activity/${id}`);
  };

  if (activitiesQuery.isLoading) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const errorMessage = activitiesQuery.error
    ? 'Impossible de charger les activités.'
    : null;

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 88 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header maquette */}
        <View style={styles.headerRow}>
          <View style={styles.headlineBlock}>
            <Text style={styles.headlineSerifDark}>L&apos;Odyssée</Text>
            <Text style={styles.headlineSerifAccent}>Commence Ici</Text>
          </View>
          <Text style={styles.wordmark}>ODOS</Text>
        </View>

        {/* Barre recherche pilule */}
        <View style={styles.searchPill}>
          <DaIcon name="loupe" variant="input" accessibilityLabel="Rechercher" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher des activités..."
            placeholderTextColor={colors.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
        </View>

        {/* Chips catégories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {chipOptions.map((label) => {
            const active = activeChip === label;
            return (
              <Pressable
                key={label}
                onPress={() => setActiveChip(label)}
                style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
              >
                <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {errorMessage ? (
          <Text style={styles.errorText}>{errorMessage}</Text>
        ) : null}

        {isSearching ? (
          <View style={styles.searchResultsBlock}>
            <Text style={styles.sectionLabel}>Résultats</Text>
            {filtered.length === 0 ? (
              <Text style={styles.emptyText}>Aucun résultat trouvé</Text>
            ) : (
              filtered.map((item) => (
                <SearchResultRow key={item.id} item={item} onPress={() => navigateToActivity(item.id)} />
              ))
            )}
          </View>
        ) : published.length === 0 ? (
          <Text style={styles.emptyText}>Aucune activité pour le moment.</Text>
        ) : browseList.length === 0 ? (
          <Text style={styles.emptyText}>Aucune activité dans cette catégorie.</Text>
        ) : (
          <>
            {/* Grande carte « incontournable » */}
            {featured ? (
              <Pressable
                onPress={() => navigateToActivity(featured.id)}
                style={styles.heroCard}
                accessibilityRole="button"
                accessibilityLabel={featured.name}
              >
                <HeroImage activity={featured} />
                <View style={styles.heroOverlay} />
                <View style={styles.heroContent}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>INCONTOURNABLE</Text>
                  </View>
                  <Text style={styles.heroTitle}>{featured.name}</Text>
                  <View style={styles.heroLocationRow}>
                    <MapPin size={14} color={colors.elevated} />
                    <Text style={styles.heroLocation}>
                      {featured.city ?? 'À découvrir'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ) : null}

            {/* Grille 2 colonnes */}
            {(gridLeft || gridRight) && (
              <View style={styles.gridRow}>
                {gridLeft ? (
                  <GridCard activity={gridLeft} onPress={() => navigateToActivity(gridLeft.id)} />
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                {gridRight ? (
                  <GridCard activity={gridRight} onPress={() => navigateToActivity(gridRight.id)} />
                ) : (
                  <View style={{ flex: 1 }} />
                )}
              </View>
            )}

            {/* Carte horizontale type liste */}
            {banner ? <BannerCard activity={banner} onPress={() => navigateToActivity(banner.id)} /> : null}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function HeroImage({ activity }: { activity: ApiActivity }) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const uri = resolveImageUrl(activity.imageUrl);
  if (!uri) {
    return <View style={[styles.heroImage, styles.heroImagePlaceholder]} />;
  }
  return (
    <Image
      source={{ uri }}
      style={styles.heroImage}
      contentFit="cover"
      transition={200}
    />
  );
}

function GridCard({ activity, onPress }: { activity: ApiActivity; onPress: () => void }) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const uri = resolveImageUrl(activity.imageUrl);
  return (
    <Pressable onPress={onPress} style={styles.gridCard} accessibilityRole="button">
      <View style={styles.gridImageWrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.gridImage} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.gridImage, styles.heroImagePlaceholder]} />
        )}
      </View>
      <Text style={styles.gridTitle} numberOfLines={2}>
        {activity.name}
      </Text>
      <Text style={styles.gridLocation}>{(activity.city ?? '—').toUpperCase()}</Text>
    </Pressable>
  );
}

function BannerCard({ activity, onPress }: { activity: ApiActivity; onPress: () => void }) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const uri = resolveImageUrl(activity.imageUrl);
  const price = formatPrice(activity.price);
  const sub =
    activity.description.length > 72
      ? `${activity.description.slice(0, 72)}…`
      : activity.description;

  return (
    <Pressable onPress={onPress} style={styles.banner} accessibilityRole="button">
      <View style={styles.bannerThumbWrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.bannerThumb} contentFit="cover" />
        ) : (
          <View style={[styles.bannerThumb, styles.heroImagePlaceholder]} />
        )}
      </View>
      <View style={styles.bannerBody}>
        <Text style={styles.bannerTitle} numberOfLines={1}>
          {activity.name}
        </Text>
        <Text style={styles.bannerSub} numberOfLines={2}>
          {sub}
        </Text>
        {price ? <Text style={styles.bannerPrice}>{price}</Text> : null}
      </View>
      <ChevronRight color={colors.primary} size={22} style={styles.bannerChevron} />
    </Pressable>
  );
}

function SearchResultRow({ item, onPress }: { item: ApiActivity; onPress: () => void }) {
  const colors = useOdosColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const uri = resolveImageUrl(item.imageUrl);
  const price = formatPrice(item.price);
  return (
    <Pressable onPress={onPress} style={styles.resultRow} accessibilityRole="button">
      <View style={styles.resultThumbWrap}>
        {uri ? (
          <Image source={{ uri }} style={styles.resultThumb} contentFit="cover" />
        ) : (
          <View style={[styles.resultThumb, styles.heroImagePlaceholder]} />
        )}
      </View>
      <View style={styles.resultBody}>
        <Text style={styles.bannerTitle} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.resultMeta} numberOfLines={1}>
          {getCategoryName(item.category)}
          {item.city ? ` · ${item.city}` : ''}
        </Text>
        {price ? <Text style={styles.bannerPrice}>{price}</Text> : null}
      </View>
      <ChevronRight color={colors.primary} size={20} />
    </Pressable>
  );
}

const winW = Dimensions.get('window').width;
const horizontalPad = 20;

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: horizontalPad,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headlineBlock: {
    flex: 1,
    paddingRight: 12,
  },
  headlineSerifDark: {
    fontFamily: serif,
    fontSize: 28,
    color: colors.text,
    fontWeight: '400',
    lineHeight: 34,
  },
  headlineSerifAccent: {
    fontFamily: serif,
    fontSize: 28,
    color: colors.accent,
    fontWeight: '400',
    lineHeight: 34,
    marginTop: 2,
  },
  wordmark: {
    fontFamily: serif,
    fontSize: 22,
    fontWeight: '600',
    color: colors.accent,
    letterSpacing: 3,
    marginTop: 4,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    paddingHorizontal: 18,
    marginBottom: 18,
    gap: 12,
    minHeight: 52,
    ...Platform.select({
      ios: {
        shadowColor: '#0f2340',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: sans,
    color: colors.text,
    padding: 0,
  },
  chipsRow: {
    gap: 10,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  chipInactive: {
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.accent,
  },
  chipLabel: {
    fontSize: 14,
    fontFamily: sans,
    fontWeight: '600',
    color: colors.muted,
  },
  chipLabelActive: {
    color: colors.elevated,
  },
  heroCard: {
    width: winW - horizontalPad * 2,
    height: Math.round((winW - horizontalPad * 2) * 0.58),
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#0f2340',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 6 },
      default: {},
    }),
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
  },
  heroImagePlaceholder: {
    backgroundColor: colors.surface,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  heroContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 18,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
    color: colors.text,
    fontFamily: sans,
  },
  heroTitle: {
    fontFamily: serif,
    fontSize: 24,
    fontWeight: '600',
    color: colors.elevated,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroLocation: {
    fontFamily: sans,
    fontSize: 14,
    color: colors.elevated,
    fontWeight: '500',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  gridCard: {
    flex: 1,
  },
  gridImageWrap: {
    borderRadius: 22,
    overflow: 'hidden',
    marginBottom: 10,
    aspectRatio: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#0f2340',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridTitle: {
    fontFamily: serif,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
    lineHeight: 20,
  },
  gridLocation: {
    fontFamily: sans,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: colors.primary,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E2EEF8',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    gap: 12,
  },
  bannerThumbWrap: {
    borderRadius: 999,
    overflow: 'hidden',
    width: 64,
    height: 64,
  },
  bannerThumb: {
    width: 64,
    height: 64,
  },
  bannerBody: {
    flex: 1,
    minWidth: 0,
  },
  bannerTitle: {
    fontFamily: serif,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  bannerSub: {
    fontFamily: serif,
    fontSize: 12,
    fontStyle: 'italic',
    color: colors.muted,
    marginTop: 4,
    lineHeight: 16,
  },
  bannerPrice: {
    fontFamily: sans,
    fontSize: 16,
    fontWeight: '800',
    color: colors.accentHover,
    marginTop: 6,
  },
  bannerChevron: {
    marginRight: 4,
  },
  sectionLabel: {
    fontFamily: serif,
    fontSize: 20,
    color: colors.text,
    marginBottom: 12,
    marginTop: 4,
  },
  searchResultsBlock: {
    paddingBottom: 24,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.elevated,
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#0f2340',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: { elevation: 2 },
      default: {},
    }),
  },
  resultThumbWrap: {
    borderRadius: 999,
    overflow: 'hidden',
    width: 52,
    height: 52,
  },
  resultThumb: {
    width: 52,
    height: 52,
  },
  resultBody: {
    flex: 1,
    minWidth: 0,
  },
  resultMeta: {
    fontFamily: sans,
    fontSize: 12,
    color: colors.muted,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 15,
    color: colors.muted,
    fontFamily: sans,
    marginTop: 24,
  },
  errorText: {
    textAlign: 'center',
    color: '#b91c1c',
    marginBottom: 12,
    fontFamily: sans,
  },
});
}
