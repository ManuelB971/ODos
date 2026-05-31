import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Map, Camera, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { ArrowLeft, Compass } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { getOdosMaplibreStyleUrl } from '@/constants/maplibreStyle';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useMapExploration } from '@/hooks/useMapExploration';
import { ApiActivity } from '@/types';
import { LatLngRegion, regionToBounds, regionToInitialCamera } from '@/utils/mapViewport';
import {
  MAP_CAMERA_PADDING,
  MAP_CAMERA_PADDING_WITH_CALLOUT,
} from '@/utils/mapCameraPadding';
import { ActivityCard } from './ActivityCard';
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
 * Carte plein écran : pins ODOS interactifs + callout sur sélection (tap pin).
 * Pas de bottom sheet / liste — l’activité s’affiche au tap sur le marqueur.
 */
export function MapExperience({ activities, loading = false, error = null }: MapExperienceProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user, setUser } = useAuth();
  const cameraRef = useRef<CameraRef | null>(null);
  const cameraBusyRef = useRef(false);
  const lastFilterKeyRef = useRef('');

  const [search, setSearch] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
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

  const selectedActivity = useMemo(
    () => filtered.find((a) => a.id === selectedId) ?? null,
    [filtered, selectedId]
  );

  const cameraPadding = selectedActivity ? MAP_CAMERA_PADDING_WITH_CALLOUT : MAP_CAMERA_PADDING;

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
    (activity: ApiActivity) => {
      setSelectedId(activity.id);
      cameraBusyRef.current = true;
      cameraRef.current?.easeTo({
        center: [activity.longitude, activity.latitude],
        zoom: 14,
        padding: MAP_CAMERA_PADDING_WITH_CALLOUT,
        duration: CAMERA_EASE_MS,
        easing: 'ease',
      });
      setTimeout(() => {
        cameraBusyRef.current = false;
      }, CAMERA_EASE_MS + 80);
    },
    []
  );

  const handlePinPress = useCallback(
    (activity: ApiActivity) => {
      if (activity.id === selectedId) {
        setSelectedId(null);
        return;
      }
      focusActivity(activity);
    },
    [focusActivity, selectedId]
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
  }, [cameraPadding, fitFilteredBounds, selectedId]);

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

  const resetViewport = useCallback(() => {
    setSelectedId(null);
    fitFilteredBounds(true);
  }, [fitFilteredBounds]);

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
          {filtered.map((activity) => {
            const isActive = activity.id === selectedId;
            return (
              <Marker
                key={`pin-${activity.id}`}
                id={`pin-${activity.id}`}
                lngLat={[activity.longitude, activity.latitude]}
                anchor="bottom"
                onPress={() => handlePinPress(activity)}
              >
                <MapPin active={isActive} label={isActive ? activity.name : undefined} />
              </Marker>
            );
          })}
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

      {loading ? (
        <View style={styles.banner}>
          <ActivityIndicator color={Colors.light.mapPrimaryCta} size="small" />
          <Text style={styles.bannerText}>Chargement des activités…</Text>
        </View>
      ) : null}

      {error ? (
        <View style={[styles.banner, styles.bannerError]}>
          <Text style={styles.bannerErrorText}>{error}</Text>
        </View>
      ) : null}

      {showEmpty ? (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Aucun lieu trouvé</Text>
          <Text style={styles.bannerText}>Essaie un autre filtre ou élargis ta recherche.</Text>
        </View>
      ) : null}

      <Pressable
        style={[styles.recenterBtn, { bottom: 24 + insets.bottom + (selectedActivity ? 168 : 0) }]}
        onPress={resetViewport}
        accessibilityRole="button"
        accessibilityLabel="Recentrer la carte"
      >
        <Compass size={18} color={Colors.light.text} />
      </Pressable>

      {selectedActivity ? (
        <View style={[styles.callout, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <ActivityCard
            activity={selectedActivity}
            active
            fullWidth
            onPress={() => router.push(`/activity/${selectedActivity.id}`)}
          />
        </View>
      ) : null}

      <ExplorationConsentModal
        visible={showConsentModal}
        loading={exploration.isConsentPending}
        onAccept={async () => {
          await exploration.giveConsent();
          if (user) {
            setUser({ ...user, mapExplorationEnabled: true });
          }
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
  banner: {
    position: 'absolute',
    top: '38%',
    left: 24,
    right: 24,
    padding: 16,
    borderRadius: 14,
    backgroundColor: `${Colors.light.elevated}F0`,
    alignItems: 'center',
    gap: 6,
    zIndex: 5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 3 },
    }),
  },
  bannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.light.text,
  },
  bannerText: {
    fontSize: 13,
    color: Colors.light.muted,
    textAlign: 'center',
  },
  bannerError: {
    backgroundColor: '#fff5f5',
  },
  bannerErrorText: {
    fontSize: 13,
    color: Colors.light.danger,
    textAlign: 'center',
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
  callout: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 0,
    zIndex: 9,
  },
});
