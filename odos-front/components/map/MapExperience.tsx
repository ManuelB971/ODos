import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { ArrowLeft, Compass } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { odosMapStyle } from '@/constants/mapStyle';
import { ApiActivity } from '@/types';
import {
  ActivityCard,
  ActivityCardSkeleton,
  ACTIVITY_CARD_GAP,
  ACTIVITY_CARD_WIDTH,
} from './ActivityCard';
import { BottomSheet, BottomSheetState } from './BottomSheet';
import { CategoryChips, Chip } from './CategoryChips';
import { MapPin } from './MapPin';
import { SearchBar } from './SearchBar';

export type MapExperienceProps = {
  activities: ApiActivity[];
  loading?: boolean;
  error?: string | null;
};

const FRANCE_FALLBACK_REGION: Region = {
  latitude: 46.603354,
  longitude: 1.888334,
  latitudeDelta: 6,
  longitudeDelta: 6,
};

/**
 * Orchestrateur plein-écran : map + top overlay + bottom sheet + synchro.
 *
 * Les 3 layers sont volontairement séparés :
 *  1. `<MapView>` en background absolu.
 *  2. Top overlay (`SearchBar` + `CategoryChips`) positionné en absolu,
 *     au-dessus de la map via `zIndex`.
 *  3. `<BottomSheet>` dessous, lui-même contrôlé avec un état "collapsed/half/full".
 *
 * Sync pin ↔ card ↔ map :
 *  - Tap sur un pin → `setSelectedId` → scroll du carrousel sur la card
 *    correspondante + recentrage de la map (`animateToRegion`).
 *  - Scroll du carrousel (momentum end) → sélectionne la card la plus visible
 *    → recentre la map sur son activité.
 */
export function MapExperience({ activities, loading = false, error = null }: MapExperienceProps) {
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const listRef = useRef<FlatList<ApiActivity> | null>(null);

  const [search, setSearch] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetState, setSheetState] = useState<BottomSheetState>('half');

  /**
   * Activités géolocalisées **et** publiées (les brouillons sont exclus même pour
   * les admins afin que la carte reflète le feed public).
   */
  const geoActivities = useMemo(
    () =>
      activities.filter(
        (a) => a.isPublished !== false && a.latitude != null && a.longitude != null
      ),
    [activities]
  );

  /** Catégories dérivées des activités, triées + toujours préfixées par "Tous". */
  const chips: Chip[] = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of geoActivities) {
      const label =
        typeof a.category === 'string'
          ? a.category
          : a.category?.name ?? '';
      if (label && !map.has(label.toLowerCase())) {
        map.set(label.toLowerCase(), label);
      }
    }
    const sorted: Chip[] = Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    return [{ id: 'all', label: 'Tous' }, ...sorted];
  }, [geoActivities]);

  /** Filtre appliqué avant rendu des pins et des cards. */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return geoActivities.filter((a) => {
      if (activeCategoryId !== 'all') {
        const catLabel = (typeof a.category === 'string' ? a.category : a.category?.name ?? '').toLowerCase();
        if (catLabel !== activeCategoryId) return false;
      }
      if (q.length === 0) return true;
      return (
        a.name.toLowerCase().includes(q) ||
        (a.city ?? '').toLowerCase().includes(q) ||
        (a.description ?? '').toLowerCase().includes(q)
      );
    });
  }, [geoActivities, search, activeCategoryId]);

  const initialRegion = useMemo<Region>(() => {
    if (filtered.length === 0) return FRANCE_FALLBACK_REGION;
    const lats = filtered.map((a) => a.latitude);
    const lngs = filtered.map((a) => a.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max((maxLat - minLat) * 1.4, 0.05),
      longitudeDelta: Math.max((maxLng - minLng) * 1.4, 0.05),
    };
  }, [filtered]);

  /**
   * Recentrage fluide sur une activité donnée + scroll carrousel.
   */
  const focusActivity = useCallback(
    (activity: ApiActivity, opts: { scrollList?: boolean; openSheet?: boolean } = {}) => {
      setSelectedId(activity.id);
      mapRef.current?.animateToRegion(
        {
          latitude: activity.latitude,
          longitude: activity.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        350
      );
      if (opts.scrollList !== false) {
        const index = filtered.findIndex((a) => a.id === activity.id);
        if (index >= 0) {
          listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
        }
      }
      if (opts.openSheet !== false && sheetState === 'collapsed') {
        setSheetState('half');
      }
    },
    [filtered, sheetState]
  );

  /** Si la liste filtrée change et que la sélection devient invalide, on reset. */
  useEffect(() => {
    if (selectedId != null && !filtered.some((a) => a.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filtered, selectedId]);

  const handleCardMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const pageWidth = ACTIVITY_CARD_WIDTH + ACTIVITY_CARD_GAP;
      const index = Math.round(offsetX / pageWidth);
      const activity = filtered[index];
      if (activity && activity.id !== selectedId) {
        focusActivity(activity, { scrollList: false });
      }
    },
    [filtered, focusActivity, selectedId]
  );

  const renderCarouselItem = useCallback(
    ({ item }: { item: ApiActivity }) => (
      <ActivityCard
        activity={item}
        active={item.id === selectedId}
        onPress={() => {
          router.push(`/activity/${item.id}`);
        }}
      />
    ),
    [router, selectedId]
  );

  const renderListItem = useCallback(
    ({ item }: { item: ApiActivity }) => (
      <ActivityCard
        activity={item}
        active={item.id === selectedId}
        fullWidth
        onPress={() => router.push(`/activity/${item.id}`)}
      />
    ),
    [router, selectedId]
  );

  const resetViewport = useCallback(() => {
    mapRef.current?.animateToRegion(initialRegion, 500);
    setSelectedId(null);
  }, [initialRegion]);

  const showEmpty = !loading && !error && filtered.length === 0;

  return (
    <View style={styles.root}>
      {/* ── Layer 1 : MAP ── */}
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={initialRegion}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        customMapStyle={odosMapStyle}
        showsCompass={false}
        showsMyLocationButton={false}
        rotateEnabled={false}
        toolbarEnabled={false}
      >
        {filtered.map((activity) => (
          <Marker
            key={`pin-${activity.id}`}
            coordinate={{ latitude: activity.latitude, longitude: activity.longitude }}
            onPress={() => focusActivity(activity)}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={Platform.OS === 'ios' ? false : activity.id === selectedId}
          >
            <MapPin active={activity.id === selectedId} label={activity.name} />
          </Marker>
        ))}
      </MapView>

      {/* ── Layer 2 : TOP OVERLAY (search + chips) ── */}
      <SafeAreaView edges={['top']} style={styles.topOverlay} pointerEvents="box-none">
        <View style={styles.topRow} pointerEvents="box-none">
          <Pressable
            style={styles.iconBtn}
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Retour"
          >
            <ArrowLeft size={18} color={Colors.light.text} />
          </Pressable>
          <View style={styles.searchWrap}>
            <SearchBar value={search} onChangeText={setSearch} />
          </View>
        </View>
        <CategoryChips chips={chips} activeId={activeCategoryId} onPressChip={(c) => setActiveCategoryId(c.id)} />
      </SafeAreaView>

      {/* ── Floating recenter FAB ── */}
      <Pressable
        style={styles.recenterBtn}
        onPress={resetViewport}
        accessibilityRole="button"
        accessibilityLabel="Recentrer la carte"
      >
        <Compass size={18} color={Colors.light.text} />
      </Pressable>

      {/* ── Layer 3 : BOTTOM SHEET ── */}
      <BottomSheet state={sheetState} onChangeState={setSheetState}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>
            {filtered.length} lieu{filtered.length > 1 ? 'x' : ''} à explorer
          </Text>
          {activeCategoryId !== 'all' && (
            <Text style={styles.sheetSubtitle}>
              Filtre · {chips.find((c) => c.id === activeCategoryId)?.label}
            </Text>
          )}
        </View>

        {loading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={Colors.light.mapPrimaryCta} />
            <Text style={styles.stateText}>Chargement des activités…</Text>
            <View style={styles.carouselRow}>
              {[0, 1, 2].map((i) => (
                <ActivityCardSkeleton key={i} />
              ))}
            </View>
          </View>
        ) : error ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTextError}>{error}</Text>
          </View>
        ) : showEmpty ? (
          <View style={styles.stateBox}>
            <Text style={styles.stateTitle}>Aucun lieu trouvé</Text>
            <Text style={styles.stateText}>Essaie un autre filtre ou élargis ta recherche.</Text>
          </View>
        ) : sheetState === 'full' ? (
          <FlatList
            data={filtered}
            keyExtractor={(item) => `list-${item.id}`}
            renderItem={renderListItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            ref={listRef}
            horizontal
            data={filtered}
            keyExtractor={(item) => `carousel-${item.id}`}
            renderItem={renderCarouselItem}
            snapToInterval={ACTIVITY_CARD_WIDTH + ACTIVITY_CARD_GAP}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={handleCardMomentumEnd}
            contentContainerStyle={styles.carouselContent}
            getItemLayout={(_, index) => ({
              length: ACTIVITY_CARD_WIDTH + ACTIVITY_CARD_GAP,
              offset: (ACTIVITY_CARD_WIDTH + ACTIVITY_CARD_GAP) * index,
              index,
            })}
          />
        )}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 10,
    zIndex: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  searchWrap: {
    flex: 1,
  },
  recenterBtn: {
    position: 'absolute',
    right: 18,
    bottom: '50%',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sheetHeader: {
    paddingHorizontal: 20,
    paddingTop: 2,
    paddingBottom: 12,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.light.text,
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
    color: Colors.light.muted,
  },
  carouselContent: {
    paddingLeft: 20,
    paddingRight: 8,
    paddingBottom: 24,
  },
  carouselRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  stateBox: {
    paddingHorizontal: 24,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  stateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.light.text,
  },
  stateText: {
    fontSize: 13,
    color: Colors.light.muted,
    textAlign: 'center',
  },
  stateTextError: {
    fontSize: 13,
    color: Colors.light.danger,
    textAlign: 'center',
  },
});
