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
  useWindowDimensions,
  View,
} from 'react-native';
import { Map, Camera, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { ArrowLeft, Compass } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getOdosMaplibreStyleUrl } from '@/constants/maplibreStyle';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useMapExploration } from '@/hooks/useMapExploration';
import { ApiActivity } from '@/types';
import { LatLngRegion, regionToBounds, regionToInitialCamera } from '@/utils/mapViewport';
import { mapCameraPaddingForSheet } from '@/utils/mapCameraPadding';
import {
  ActivityCard,
  ActivityCardSkeleton,
  ACTIVITY_CARD_GAP,
  ACTIVITY_CARD_WIDTH,
} from './ActivityCard';
import { ActivityPinsLayer } from './ActivityPinsLayer';
import { BottomSheet, BottomSheetState } from './BottomSheet';
import { CategoryChips, Chip } from './CategoryChips';
import { ExplorationConsentModal } from './ExplorationConsentModal';
import { ExplorationProgressChip } from './ExplorationProgressChip';
import { ExplorationVisitedLayer } from './ExplorationVisitedLayer';
import { MapPin } from './MapPin';
import { SearchBar } from './SearchBar';

export type MapExperienceProps = {
  activities: ApiActivity[];
  loading?: boolean;
  error?: string | null;
};

const FRANCE_FALLBACK_REGION: LatLngRegion = {
  latitude: 46.603354,
  longitude: 1.888334,
  latitudeDelta: 6,
  longitudeDelta: 6,
};

const CAMERA_EASE_MS = 380;

/**
 * Orchestrateur plein-écran : map + overlays + bottom sheet + synchro.
 *
 * Layers (z-order bas → haut dans MapLibre) :
 *  1. Exploration visitée (fill)
 *  2. Pins activités (cercles GL)
 *  3. Pin sélectionné (Marker React + label)
 *
 * Overlays RN au-dessus de la map :
 *  - Top : recherche, chips, jauge exploration
 *  - FAB recentrage (position liée au haut du bottom sheet)
 *  - Bottom sheet
 */
export function MapExperience({ activities, loading = false, error = null }: MapExperienceProps) {
  const router = useRouter();
  const { height: windowHeight } = useWindowDimensions();
  const { isAuthenticated, user, setUser } = useAuth();
  const cameraRef = useRef<CameraRef | null>(null);
  const listRef = useRef<FlatList<ApiActivity> | null>(null);
  const cameraBusyRef = useRef(false);
  const lastFilterKeyRef = useRef('');

  const [search, setSearch] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [sheetState, setSheetState] = useState<BottomSheetState>('half');
  const [sheetTopY, setSheetTopY] = useState(windowHeight * 0.55);
  const [consentDismissed, setConsentDismissed] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const exploration = useMapExploration(isAuthenticated && (user?.mapExplorationEnabled ?? false));

  const geoActivities = useMemo(
    () =>
      activities.filter(
        (a) => a.isPublished !== false && a.latitude != null && a.longitude != null
      ),
    [activities]
  );

  const chips: Chip[] = useMemo(() => {
    const seen = new globalThis.Map<string, string>();
    for (const a of geoActivities) {
      const label =
        typeof a.category === 'string' ? a.category : a.category?.name ?? '';
      if (label && !seen.has(label.toLowerCase())) {
        seen.set(label.toLowerCase(), label);
      }
    }
    const sorted: Chip[] = Array.from(seen.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'fr'));
    return [{ id: 'all', label: 'Tous' }, ...sorted];
  }, [geoActivities]);

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

  const filterKey = useMemo(
    () => filtered.map((a) => a.id).join(','),
    [filtered]
  );

  const initialRegion = useMemo<LatLngRegion>(() => {
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

  const initialCamera = useMemo(
    () => regionToInitialCamera(initialRegion),
    [initialRegion]
  );

  const cameraPadding = useMemo(
    () => mapCameraPaddingForSheet(sheetState),
    [sheetState]
  );

  const selectedActivity = useMemo(
    () => filtered.find((a) => a.id === selectedId) ?? null,
    [filtered, selectedId]
  );

  const fitFilteredBounds = useCallback(
    (animated: boolean) => {
      cameraRef.current?.fitBounds(regionToBounds(initialRegion), {
        padding: cameraPadding,
        duration: animated ? 480 : 0,
        easing: 'ease',
      });
    },
    [initialRegion, cameraPadding]
  );

  const focusActivity = useCallback(
    (activity: ApiActivity, opts: { scrollList?: boolean; openSheet?: boolean } = {}) => {
      setSelectedId(activity.id);
      cameraBusyRef.current = true;
      cameraRef.current?.easeTo({
        center: [activity.longitude, activity.latitude],
        zoom: 14,
        padding: cameraPadding,
        duration: CAMERA_EASE_MS,
        easing: 'ease',
      });
      setTimeout(() => {
        cameraBusyRef.current = false;
      }, CAMERA_EASE_MS + 80);

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
    [filtered, sheetState, cameraPadding]
  );

  useEffect(() => {
    if (selectedId != null && !filtered.some((a) => a.id === selectedId)) {
      setSelectedId(null);
    }
  }, [filtered, selectedId]);

  useEffect(() => {
    if (filterKey === lastFilterKeyRef.current) return;
    lastFilterKeyRef.current = filterKey;
    const id = requestAnimationFrame(() => fitFilteredBounds(false));
    return () => cancelAnimationFrame(id);
  }, [filterKey, fitFilteredBounds]);

  useEffect(() => {
    if (cameraBusyRef.current || selectedId != null) return;
    fitFilteredBounds(true);
  }, [sheetState, cameraPadding, fitFilteredBounds, selectedId]);

  useEffect(() => {
    if (
      isAuthenticated &&
      user?.mapExplorationEnabled &&
      exploration.overview &&
      !exploration.consented &&
      !consentDismissed
    ) {
      setShowConsentModal(true);
    } else if (!user?.mapExplorationEnabled) {
      setShowConsentModal(false);
    }
  }, [
    isAuthenticated,
    user?.mapExplorationEnabled,
    exploration.overview,
    exploration.consented,
    consentDismissed,
  ]);

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
        onPress={() => router.push(`/activity/${item.id}`)}
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
    setSelectedId(null);
    fitFilteredBounds(true);
  }, [fitFilteredBounds]);

  const fabBottom = Math.max(24, windowHeight - sheetTopY + 12);

  const showEmpty = !loading && !error && filtered.length === 0;

  return (
    <View style={styles.root}>
      <View style={styles.mapStage}>
        <Map
          style={styles.map}
          mapStyle={getOdosMaplibreStyleUrl()}
          compass={false}
          scaleBar={false}
          attribution
          logo
          touchPitch={false}
          touchRotate={false}
        >
          <Camera ref={cameraRef} initialViewState={initialCamera} />
          <ExplorationVisitedLayer
            geoJson={exploration.active ? (exploration.visitedGeoJson ?? null) : null}
          />
          <ActivityPinsLayer activities={filtered} selectedId={selectedId} />
          {selectedActivity ? (
            <Marker
              key={`pin-selected-${selectedActivity.id}`}
              id={`pin-selected-${selectedActivity.id}`}
              lngLat={[selectedActivity.longitude, selectedActivity.latitude]}
              anchor="bottom"
              onPress={() => focusActivity(selectedActivity)}
            >
              <MapPin active label={selectedActivity.name} />
            </Marker>
          ) : null}
        </Map>
      </View>

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
        {isAuthenticated && exploration.active && exploration.overview ? (
          <ExplorationProgressChip
            percent={exploration.percent}
            visitedCount={exploration.overview.visitedCount}
            totalCells={exploration.overview.totalCells}
          />
        ) : null}
      </SafeAreaView>

      <Pressable
        style={[styles.recenterBtn, { bottom: fabBottom }]}
        onPress={resetViewport}
        accessibilityRole="button"
        accessibilityLabel="Recentrer la carte"
      >
        <Compass size={18} color={Colors.light.text} />
      </Pressable>

      <BottomSheet
        state={sheetState}
        onChangeState={setSheetState}
        onSheetTopY={setSheetTopY}
      >
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

      <ExplorationConsentModal
        visible={showConsentModal}
        loading={exploration.isConsentPending}
        onAccept={async () => {
          await exploration.giveConsent();
          setUser((u) => (u ? { ...u, mapExplorationEnabled: true } : u));
          setShowConsentModal(false);
        }}
        onDecline={() => {
          setConsentDismissed(true);
          setShowConsentModal(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapStage: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  map: {
    flex: 1,
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
      android: { elevation: 4 },
    }),
  },
  searchWrap: {
    flex: 1,
  },
  recenterBtn: {
    position: 'absolute',
    right: 18,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
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
