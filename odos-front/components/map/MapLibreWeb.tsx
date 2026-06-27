/**
 * Implémentation **web** de la surface `@maplibre/maplibre-react-native` utilisée
 * par l'app, adossée à `maplibre-gl` (carte GL DOM). Résolue par Metro pour
 * `platform === 'web'` uniquement (voir `metro.config.js`) : ce fichier — et donc
 * `maplibre-gl` — n'entre JAMAIS dans le bundle natif (Android/iOS).
 *
 * Surface répliquée (signatures identiques au natif, cf. `MapLibreStub.tsx`) :
 *   <Map>, <Camera ref>, <Marker>, <GeoJSONSource>, <Layer>.
 *
 * Choix de robustesse :
 * - `maplibre-gl` est **importé dynamiquement** (et son CSS) côté client, jamais
 *   au niveau module : le prerender statique d'`expo export -p web` (Node, sans
 *   `window`/`document`) ne charge donc pas la lib et ne casse pas.
 * - Au rechargement du style (bascule clair/sombre), MapLibre purge sources &
 *   layers : on les ré-injecte via un compteur `styleEpoch` propagé par contexte.
 * - Les enfants RN d'un `<Marker>` (composant `MapPin`) sont rendus dans le nœud
 *   DOM du marqueur via `createPortal` (react-native-web → DOM).
 */
import React, {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import type {
  Map as MlMap,
  Marker as MlMarker,
  GeoJSONSource as MlGeoJSONSource,
  LngLatBoundsLike,
  CameraOptions,
  EaseToOptions,
  FitBoundsOptions,
} from 'maplibre-gl';

type Gl = typeof import('maplibre-gl');

/** Contrat caméra impératif (identique au stub natif). */
export type CameraRef = {
  easeTo: (opts: unknown) => void;
  fitBounds: (bounds: unknown, opts?: unknown) => void;
  setCamera: (opts: unknown) => void;
};

type MapContextValue = {
  map: MlMap | null;
  gl: Gl | null;
  /** Incrémenté à chaque `style.load` (init + chaque `setStyle`). 0 = pas encore chargé. */
  styleEpoch: number;
};

const MapContext = createContext<MapContextValue>({ map: null, gl: null, styleEpoch: 0 });
const useMapContext = () => useContext(MapContext);

type SourceContextValue = { sourceId: string | null; ready: boolean };
const SourceContext = createContext<SourceContextValue>({ sourceId: null, ready: false });

// ── Helpers de conversion vers l'API maplibre-gl ──────────────────────────────

type CameraOptionsInput = {
  center?: [number, number];
  zoom?: number;
  padding?: { top: number; right: number; bottom: number; left: number };
  duration?: number;
};

function toCameraOptions(opts: unknown): CameraOptions {
  const o = (opts ?? {}) as CameraOptionsInput;
  const out: CameraOptions = {};
  if (o.center) out.center = o.center;
  if (typeof o.zoom === 'number') out.zoom = o.zoom;
  return out;
}

function toEaseOptions(opts: unknown): EaseToOptions {
  const o = (opts ?? {}) as CameraOptionsInput;
  const out: EaseToOptions = { ...toCameraOptions(opts) };
  if (o.padding) out.padding = o.padding;
  if (typeof o.duration === 'number') out.duration = o.duration;
  return out;
}

function toLngLatBounds(bounds: unknown): LngLatBoundsLike {
  // Entrée: [west, south, east, north] (cf. utils/mapViewport.regionToBounds).
  const b = bounds as [number, number, number, number];
  return [
    [b[0], b[1]],
    [b[2], b[3]],
  ];
}

function toFitBoundsOptions(opts: unknown): FitBoundsOptions {
  const o = (opts ?? {}) as { padding?: FitBoundsOptions['padding']; duration?: number };
  const out: FitBoundsOptions = {};
  if (o.padding) out.padding = o.padding;
  if (typeof o.duration === 'number') out.duration = o.duration;
  return out;
}

// ── <Map> ─────────────────────────────────────────────────────────────────────

type MapProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  mapStyle?: string;
  attribution?: boolean;
  logo?: boolean;
  compass?: boolean;
  scaleBar?: boolean;
  dragPan?: boolean;
  touchZoom?: boolean;
  doubleTapZoom?: boolean;
  touchRotate?: boolean;
  touchPitch?: boolean;
  onDidFinishLoadingStyle?: () => void;
};

export const Map = forwardRef<View, MapProps>(function Map(
  {
    children,
    style,
    mapStyle,
    attribution = false,
    compass = false,
    scaleBar = false,
    touchRotate,
    touchPitch,
    onDidFinishLoadingStyle,
  },
  _ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<MlMap | null>(null);
  const [gl, setGl] = useState<Gl | null>(null);
  const [styleEpoch, setStyleEpoch] = useState(0);

  // Garde la dernière valeur du callback sans recréer la carte.
  const onStyleRef = useRef(onDidFinishLoadingStyle);
  onStyleRef.current = onDidFinishLoadingStyle;
  const styleUrlRef = useRef<string | undefined>(mapStyle);

  // Création unique de la carte (client only — import dynamique de maplibre-gl).
  useEffect(() => {
    let cancelled = false;
    let created: MlMap | null = null;

    (async () => {
      if (!containerRef.current) return;
      const mod = await import('maplibre-gl');
      // CSS de maplibre (canvas, contrôles). Import dynamique → hors prerender.
      await import('maplibre-gl/dist/maplibre-gl.css');
      if (cancelled || !containerRef.current) return;

      const maplibregl = mod.default ?? (mod as unknown as Gl);
      const instance = new maplibregl.Map({
        container: containerRef.current,
        style: mapStyle ?? 'https://demotiles.maplibre.org/style.json',
        attributionControl: attribution ? undefined : false,
      });
      created = instance;
      styleUrlRef.current = mapStyle;

      if (compass) instance.addControl(new maplibregl.NavigationControl({ showZoom: true }), 'top-right');
      if (scaleBar) instance.addControl(new maplibregl.ScaleControl());
      if (touchRotate === false) {
        instance.dragRotate.disable();
        instance.touchZoomRotate.disableRotation();
        instance.keyboard.disableRotation();
      }
      if (touchPitch === false) instance.touchPitch.disable();

      // `style.load` : init + chaque setStyle. Pilote la (ré)injection des layers.
      instance.on('style.load', () => {
        if (cancelled) return;
        setStyleEpoch((e) => e + 1);
        onStyleRef.current?.();
      });

      setGl(maplibregl);
      setMap(instance);
    })();

    return () => {
      cancelled = true;
      created?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Bascule de style (clair/sombre) → setStyle, qui re-déclenchera `style.load`.
  useEffect(() => {
    if (!map || !mapStyle || mapStyle === styleUrlRef.current) return;
    styleUrlRef.current = mapStyle;
    map.setStyle(mapStyle);
  }, [map, mapStyle]);

  const ctx = useMemo<MapContextValue>(() => ({ map, gl, styleEpoch }), [map, gl, styleEpoch]);

  return (
    <View ref={_ref} style={style}>
      {/* Conteneur DOM de la carte GL, en absolute fill du <View> parent. */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      <MapContext.Provider value={ctx}>{children}</MapContext.Provider>
    </View>
  );
});

// ── <Camera> ──────────────────────────────────────────────────────────────────

type CameraProps = {
  initialViewState?: { center: [number, number]; zoom: number };
};

export const Camera = forwardRef<CameraRef, CameraProps>(function Camera({ initialViewState }, ref) {
  const { map } = useMapContext();
  const appliedInitial = useRef(false);

  useEffect(() => {
    if (!map || !initialViewState || appliedInitial.current) return;
    map.jumpTo({ center: initialViewState.center, zoom: initialViewState.zoom });
    appliedInitial.current = true;
  }, [map, initialViewState]);

  useImperativeHandle(
    ref,
    () => ({
      easeTo: (opts) => map?.easeTo(toEaseOptions(opts)),
      fitBounds: (bounds, opts) => map?.fitBounds(toLngLatBounds(bounds), toFitBoundsOptions(opts)),
      setCamera: (opts) => map?.jumpTo(toCameraOptions(opts)),
    }),
    [map],
  );

  return null;
});

// ── <Marker> ──────────────────────────────────────────────────────────────────

type MarkerProps = {
  id?: string;
  lngLat: [number, number];
  anchor?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  children?: React.ReactNode;
  onPress?: () => void;
};

export function Marker({ lngLat, anchor = 'center', children, onPress }: MarkerProps) {
  const { map, gl } = useMapContext();
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const markerRef = useRef<MlMarker | null>(null);
  const onPressRef = useRef(onPress);
  onPressRef.current = onPress;

  // Élément hôte du marqueur, créé côté client (SSR-safe).
  useEffect(() => {
    const node = document.createElement('div');
    node.style.cursor = onPressRef.current ? 'pointer' : 'default';
    const handler = (e: MouseEvent) => {
      e.stopPropagation();
      onPressRef.current?.();
    };
    node.addEventListener('click', handler);
    setEl(node);
    return () => node.removeEventListener('click', handler);
  }, []);

  // Création / nettoyage du marqueur GL.
  useEffect(() => {
    if (!map || !gl || !el) return;
    const marker = new gl.Marker({ element: el, anchor }).setLngLat(lngLat).addTo(map);
    markerRef.current = marker;
    return () => {
      marker.remove();
      markerRef.current = null;
    };
    // anchor/el stables ; position mise à jour par l'effet suivant.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, gl, el]);

  // Suivi de position (pan d'activité, recentrage ville…).
  useEffect(() => {
    markerRef.current?.setLngLat(lngLat);
  }, [lngLat]);

  return el ? createPortal(children, el) : null;
}

// ── <GeoJSONSource> ───────────────────────────────────────────────────────────

type GeoJSONSourceProps = {
  id: string;
  data: GeoJSON.FeatureCollection | GeoJSON.Feature | GeoJSON.Geometry | unknown;
  children?: React.ReactNode;
};

export function GeoJSONSource({ id, data, children }: GeoJSONSourceProps) {
  const { map, styleEpoch } = useMapContext();
  const [ready, setReady] = useState(false);

  // (Ré)ajout de la source à chaque chargement de style (styleEpoch > 0).
  useEffect(() => {
    if (!map || styleEpoch === 0) return;
    setReady(false);
    try {
      if (!map.getSource(id)) {
        map.addSource(id, { type: 'geojson', data: data as GeoJSON.GeoJSON });
      }
      setReady(true);
    } catch {
      // style pas tout à fait prêt — sera retenté au prochain styleEpoch.
    }
    return () => {
      try {
        if (map.getSource(id)) map.removeSource(id);
      } catch {
        // source déjà purgée par setStyle.
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, styleEpoch, id]);

  // Mise à jour des données (filtre, sélection, zones visitées…).
  useEffect(() => {
    if (!map || !ready) return;
    try {
      const src = map.getSource(id) as MlGeoJSONSource | undefined;
      src?.setData(data as GeoJSON.GeoJSON);
    } catch {
      // ignore
    }
  }, [map, ready, id, data]);

  const ctx = useMemo<SourceContextValue>(() => ({ sourceId: id, ready }), [id, ready]);
  return <SourceContext.Provider value={ctx}>{children}</SourceContext.Provider>;
}

// ── <Layer> ───────────────────────────────────────────────────────────────────

type LayerProps = {
  id: string;
  type: 'circle' | 'fill' | 'line' | 'symbol';
  source?: string;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
};

export function Layer({ id, type, source, paint, layout }: LayerProps) {
  const { map, styleEpoch } = useMapContext();
  const { sourceId, ready } = useContext(SourceContext);
  const resolvedSource = source ?? sourceId ?? undefined;

  // Ajout / retrait du layer une fois la source prête (et à chaque style).
  useEffect(() => {
    if (!map || !ready || !resolvedSource || styleEpoch === 0) return;
    try {
      if (!map.getLayer(id)) {
        map.addLayer({
          id,
          type,
          source: resolvedSource,
          ...(paint ? { paint } : {}),
          ...(layout ? { layout } : {}),
        } as Parameters<MlMap['addLayer']>[0]);
      }
    } catch {
      // ignore
    }
    return () => {
      try {
        if (map.getLayer(id)) map.removeLayer(id);
      } catch {
        // layer déjà purgé par setStyle.
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ready, styleEpoch, id, type, resolvedSource]);

  // Mise à jour réactive de paint/layout (thème, sélection…).
  const paintKey = JSON.stringify(paint ?? null);
  const layoutKey = JSON.stringify(layout ?? null);
  useEffect(() => {
    if (!map || !ready) return;
    try {
      if (!map.getLayer(id)) return;
      if (paint) {
        for (const [k, v] of Object.entries(paint)) {
          map.setPaintProperty(id, k, v as never);
        }
      }
      if (layout) {
        for (const [k, v] of Object.entries(layout)) {
          map.setLayoutProperty(id, k, v as never);
        }
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, ready, id, paintKey, layoutKey]);

  return null;
}
