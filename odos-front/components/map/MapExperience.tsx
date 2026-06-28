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
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Map, Camera, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import { ArrowLeft } from 'lucide-react-native';
import { DaIcon } from '@/components/ui/DaIcon';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useQuery } from '@tanstack/react-query';

import { getOdosMaplibreStyleUrl } from '@/constants/maplibreStyle';
import { FontFamily } from '@/constants/theme';
import { useResponsive } from '@/hooks/useResponsive';
import { useOdosColors, useTheme, type OdosColorPalette } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useMapExploration } from '@/hooks/useMapExploration';
import { fetchVisitedIds } from '@/scripts/api';
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
import { CityFilter } from '@/components/CityFilter';
import { useCity } from '@/context/CityContext';

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
  const colors = useOdosColors();
  const { colorScheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isDesktop } = useResponsive();
  // Desktop web : carte + **panneau latéral de résultats** (façon Maps/Airbnb),
  // au lieu du seul callout au tap. Gardé derrière web+desktop → mobile/natif inchangé.
  // Cf. docs/AUDIT_RESPONSIVE_WEB.md (Niveau 2).
  const sidePanel = Platform.OS === 'web' && isDesktop;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user, setUser } = useAuth();
  const { selectedCity, cityCentroid } = useCity();
  const cameraRef = useRef<CameraRef | null>(null);
  const cameraBusyRef = useRef(false);
  const cameraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFilterKeyRef = useRef('');

  const [search, setSearch] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [consentDismissed, setConsentDismissed] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  // Incrémenté à chaque (re)chargement du style MapLibre. Les style-layers
  // ajoutés à la volée (calque "zones visitées") sont purgés quand le style finit
  // de charger ; on remonte donc le calque via `key={styleVersion}` une fois le
  // style prêt, sinon les zones orange n'apparaissent qu'une fraction de seconde.
  const [styleVersion, setStyleVersion] = useState(0);

  const exploration = useMapExploration(isAuthenticated && (user?.mapExplorationEnabled ?? false));

  const clearCameraTimer = useCallback(() => {
    if (cameraTimerRef.current != null) {
      clearTimeout(cameraTimerRef.current);
      cameraTimerRef.current = null;
    }
  }, []);

  const scheduleCameraReady = useCallback(
    (delayMs: number) => {
      clearCameraTimer();
      cameraTimerRef.current = setTimeout(() => {
        cameraBusyRef.current = false;
        cameraTimerRef.current = null;
      }, delayMs);
    },
    [clearCameraTimer],
  );

  useEffect(() => () => clearCameraTimer(), [clearCameraTimer]);

  // Progression d'exploration = activités marquées "visitées" / total publié.
  // Même métrique que la barre du profil ; le cache ['visitedIds'] est invalidé
  // au toggle "Lieu visité", donc le chip se met à jour automatiquement.
  const visitedQuery = useQuery<number[]>({
    queryKey: ['visitedIds'],
    queryFn: fetchVisitedIds,
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 2,
  });

  const geoActivities = useMemo(
    () =>
      activities.filter(
        (a) => a.isPublished !== false && a.latitude != null && a.longitude != null
      ),
    [activities]
  );

  const cityScopedActivities = useMemo(() => {
    if (!selectedCity) return geoActivities;
    return geoActivities.filter((a) => (a.city ?? '') === selectedCity);
  }, [geoActivities, selectedCity]);

  const publishedCount = useMemo(
    () => cityScopedActivities.length,
    [cityScopedActivities]
  );
  const visitedCount = visitedQuery.data?.length ?? 0;
  const explorationPercent =
    publishedCount > 0 ? Math.round((visitedCount / publishedCount) * 100) : 0;

  const chips: Chip[] = useMemo(() => {
    const seen = new globalThis.Map<string, string>();
    for (const a of cityScopedActivities) {
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
  }, [cityScopedActivities]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cityScopedActivities.filter((a) => {
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
  }, [cityScopedActivities, search, activeCategoryId]);

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
      scheduleCameraReady(CAMERA_EASE_MS + 80);
    },
    [scheduleCameraReady]
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
    if (!selectedCity) return;
    const center = cityCentroid(selectedCity);
    if (!center) return;
    setSelectedId(null);
    cameraBusyRef.current = true;
    cameraRef.current?.easeTo({
      center: [center.longitude, center.latitude],
      zoom: 12,
      padding: MAP_CAMERA_PADDING,
      duration: 480,
      easing: 'ease',
    });
    scheduleCameraReady(560);
    return clearCameraTimer;
  }, [selectedCity, cityCentroid, scheduleCameraReady, clearCameraTimer]);

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
    <View style={[styles.root, sidePanel && styles.rootRow]}>
      {sidePanel ? (
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Text style={styles.panelTitle}>Résultats</Text>
            <Text style={styles.panelCount}>
              {filtered.length} lieu{filtered.length > 1 ? 'x' : ''}
            </Text>
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(a) => String(a.id)}
            contentContainerStyle={styles.panelListContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ActivityCard
                activity={item}
                active={item.id === selectedId}
                fullWidth
                onPress={() => focusActivity(item)}
              />
            )}
            ListEmptyComponent={
              loading ? null : (
                <Text style={styles.panelEmpty}>
                  Aucun lieu trouvé. Essaie un autre filtre ou élargis ta recherche.
                </Text>
              )
            }
          />
        </View>
      ) : null}
      <View style={styles.mapColumn}>
      <View style={styles.mapStage}>
        <Map
          style={styles.map}
          mapStyle={getOdosMaplibreStyleUrl(colorScheme)}
          compass={false}
          scaleBar={false}
          attribution
          logo
          touchPitch={false}
          touchRotate={false}
          onDidFinishLoadingStyle={() => setStyleVersion((v) => v + 1)}
        >
          <Camera ref={cameraRef} initialViewState={initialCamera} />
          {styleVersion > 0 ? (
            <ExplorationVisitedLayer
              key={`visited-${styleVersion}`}
              geoJson={exploration.active ? (exploration.visitedGeoJson ?? null) : null}
            />
          ) : null}
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
                <MapPin
                  active={isActive}
                  label={isActive ? activity.name : undefined}
                  accessibilityLabel={`${activity.name}${
                    typeof activity.category === 'string'
                      ? `, ${activity.category}`
                      : activity.category?.name
                        ? `, ${activity.category.name}`
                        : ''
                  }`}
                />
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
            <ArrowLeft size={18} color={colors.text} />
          </Pressable>
          <View style={styles.searchWrap}>
            <SearchBar value={search} onChangeText={setSearch} />
          </View>
        </View>
        <CityFilter />
        <CategoryChips chips={chips} activeId={activeCategoryId} onPressChip={(c) => setActiveCategoryId(c.id)} />
        {isAuthenticated && publishedCount > 0 ? (
          <ExplorationProgressChip
            percent={explorationPercent}
            visitedCount={visitedCount}
            total={publishedCount}
            unitLabel="lieux"
          />
        ) : null}
      </SafeAreaView>

      {loading ? (
        <View style={styles.banner}>
          <ActivityIndicator color={colors.mapPrimaryCta} size="small" />
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
        <DaIcon name="boussole" variant="mapControl" accessibilityLabel="Recentrer la carte" />
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
    </View>
  );
}

function createStyles(colors: OdosColorPalette) {
  return StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // ── Desktop web : carte + panneau latéral de résultats ──
  rootRow: {
    flexDirection: 'row',
  },
  mapColumn: {
    flex: 1,
    position: 'relative',
  },
  panel: {
    width: 380,
    backgroundColor: colors.background,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  panelHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  panelTitle: {
    fontFamily: FontFamily.display,
    fontSize: 22,
    color: colors.text,
  },
  panelCount: {
    marginTop: 2,
    fontSize: 13,
    fontFamily: FontFamily.ui,
    color: colors.muted,
  },
  panelListContent: {
    padding: 12,
    gap: 10,
  },
  panelEmpty: {
    padding: 24,
    fontSize: 14,
    fontFamily: FontFamily.ui,
    color: colors.muted,
    textAlign: 'center',
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
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: `${colors.elevated}F0`,
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
    color: colors.text,
  },
  bannerText: {
    fontSize: 13,
    color: colors.muted,
    textAlign: 'center',
  },
  bannerError: {
    backgroundColor: colors.errorSurface,
    borderWidth: 1,
    borderColor: `${colors.danger}44`,
  },
  bannerErrorText: {
    fontSize: 13,
    color: colors.danger,
    textAlign: 'center',
  },
  recenterBtn: {
    position: 'absolute',
    right: 18,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.overlay,
    borderWidth: 1,
    borderColor: colors.border,
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
}
