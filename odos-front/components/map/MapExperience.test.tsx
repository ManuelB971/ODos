import React from 'react';
import { Pressable, View, Text } from 'react-native';
import * as fs from 'fs';
import * as path from 'path';

import { fireEvent, render, screen, within, cleanup } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { MapExperience } from '@/components/map/MapExperience';
import type { ApiActivity } from '@/types';

let queryClient: QueryClient;

/** Rend MapExperience dans un QueryClientProvider (requis par useQuery interne). */
function renderMap(ui: React.ReactElement) {
  queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockBack = jest.fn();
const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    user: null,
    setUser: jest.fn(),
  }),
}));

jest.mock('@/context/CityContext', () => ({
  useCity: () => ({
    cities: [],
    citiesLoading: false,
    citiesError: null,
    selectedCity: null,
    setSelectedCity: jest.fn(),
    cityCentroid: () => null,
  }),
}));

jest.mock('@/components/CityFilter', () => ({
  CityFilter: () => null,
}));

jest.mock('@/hooks/useMapExploration', () => ({
  useMapExploration: () => ({
    active: false,
    overview: null,
    percent: 0,
    consented: false,
    visitedGeoJson: null,
    isConsentPending: false,
    giveConsent: jest.fn(),
  }),
}));

jest.mock('@/components/map/ExplorationVisitedLayer', () => ({
  ExplorationVisitedLayer: () => null,
}));

jest.mock('@/components/map/ExplorationConsentModal', () => ({
  ExplorationConsentModal: () => null,
}));

jest.mock('@/components/map/ExplorationProgressChip', () => ({
  ExplorationProgressChip: () => null,
}));

jest.mock('@maplibre/maplibre-react-native', () => {
  const mockReact = jest.requireActual<typeof import('react')>('react');
  const { Pressable: MockPressable, View: MockView } =
    jest.requireActual<typeof import('react-native')>('react-native');

  const Marker = ({
    id,
    onPress,
    children,
  }: {
    id: string;
    onPress?: () => void;
    children?: React.ReactNode;
  }) => (
    <MockPressable testID={id} onPress={onPress} accessibilityRole="button">
      {children}
    </MockPressable>
  );

  const Map = ({ children }: { children?: React.ReactNode }) => (
    <MockView testID="map">{children}</MockView>
  );

  const Camera = mockReact.forwardRef(function Camera(_props: unknown, _ref: unknown) {
    return null;
  });

  return { Map, Camera, Marker };
});

jest.mock('@/components/map/MapPin', () => {
  const { View: MockView, Text: MockText } =
    jest.requireActual<typeof import('react-native')>('react-native');

  return {
    MapPin: ({ active, label }: { active?: boolean; label?: string }) => (
      <MockView testID={active ? 'map-pin-active' : 'map-pin'}>
        {label ? <MockText testID="map-pin-label">{label}</MockText> : null}
      </MockView>
    ),
  };
});

function makeActivity(overrides: Partial<ApiActivity> = {}): ApiActivity {
  return {
    id: 1,
    name: 'Musée du Louvre',
    description: 'Visite culturelle',
    latitude: 48.8606,
    longitude: 2.3376,
    city: 'Paris',
    category: 'Culture',
    price: 15,
    imageUrl: null,
    dateStart: null,
    dateEnd: null,
    isPublished: true,
    ...overrides,
  };
}

const parisMuseum = makeActivity();
const lyonPark = makeActivity({
  id: 2,
  name: 'Parc de la Tête d Or',
  latitude: 45.7833,
  longitude: 4.85,
  city: 'Lyon',
  category: 'Nature',
});

describe('MapExperience UX contract', () => {
  const sourcePath = path.join(__dirname, 'MapExperience.tsx');
  const source = fs.readFileSync(sourcePath, 'utf8');

  it('does not reintroduce bottom sheet or GL pin layer', () => {
    expect(source).not.toMatch(/BottomSheet/);
    expect(source).not.toMatch(/ActivityPinsLayer/);
  });

  it('keeps the results list desktop-only (mobile = pins + callout)', () => {
    // Le panneau latéral de résultats (FlatList) est réservé au desktop web : sur mobile,
    // l'expérience reste pins + callout au tap. Cf. AUDIT_RESPONSIVE_WEB.md (Niveau 2).
    expect(source).toMatch(/const sidePanel = Platform\.OS === 'web' && isDesktop/);
    // Toute FlatList doit être à l'intérieur du bloc desktop (gardé par `sidePanel ?`).
    const sidePanelIdx = source.indexOf('sidePanel ? (');
    const flatListIdx = source.indexOf('<FlatList');
    expect(sidePanelIdx).toBeGreaterThan(-1);
    expect(flatListIdx).toBeGreaterThan(sidePanelIdx);
  });

  it('renders MapPin inside MapLibre Marker for each geo activity', () => {
    expect(source).toMatch(/<Marker[\s\S]*<MapPin/);
  });
});

describe('MapExperience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    queryClient?.clear();
  });

  it('renders one marker per published geo-located activity', () => {
    renderMap(<MapExperience activities={[parisMuseum, lyonPark]} />);

    expect(screen.getByTestId('pin-1')).toBeTruthy();
    expect(screen.getByTestId('pin-2')).toBeTruthy();
    expect(screen.getAllByTestId('map-pin')).toHaveLength(2);
  });

  it('skips unpublished or activities without coordinates', () => {
    renderMap(
      <MapExperience
        activities={[
          parisMuseum,
          makeActivity({ id: 3, isPublished: false }),
          makeActivity({ id: 4, latitude: null as unknown as number }),
        ]}
      />
    );

    expect(screen.getByTestId('pin-1')).toBeTruthy();
    expect(screen.queryByTestId('pin-3')).toBeNull();
    expect(screen.queryByTestId('pin-4')).toBeNull();
  });

  it('shows callout on pin tap and hides it on second tap', () => {
    renderMap(<MapExperience activities={[parisMuseum, lyonPark]} />);

    expect(screen.queryByLabelText('Activité Musée du Louvre')).toBeNull();

    fireEvent.press(screen.getByTestId('pin-1'));
    expect(screen.getByLabelText('Activité Musée du Louvre')).toBeTruthy();
    expect(screen.getByTestId('map-pin-label')).toHaveTextContent('Musée du Louvre');

    fireEvent.press(screen.getByTestId('pin-1'));
    expect(screen.queryByLabelText('Activité Musée du Louvre')).toBeNull();
  });

  it('navigates to activity detail when callout is pressed', () => {
    renderMap(<MapExperience activities={[parisMuseum]} />);

    fireEvent.press(screen.getByTestId('pin-1'));
    fireEvent.press(screen.getByLabelText('Activité Musée du Louvre'));

    expect(mockPush).toHaveBeenCalledWith('/activity/1');
  });

  it('filters markers via search text', () => {
    renderMap(<MapExperience activities={[parisMuseum, lyonPark]} />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Rechercher un lieu, une activité…'),
      'Lyon'
    );

    expect(screen.queryByTestId('pin-1')).toBeNull();
    expect(screen.getByTestId('pin-2')).toBeTruthy();
  });

  it('filters markers via category chip', () => {
    renderMap(<MapExperience activities={[parisMuseum, lyonPark]} />);

    fireEvent.press(screen.getByLabelText('Nature'));

    expect(screen.queryByTestId('pin-1')).toBeNull();
    expect(screen.getByTestId('pin-2')).toBeTruthy();
  });

  it('shows loading banner', () => {
    renderMap(<MapExperience activities={[]} loading />);

    expect(screen.getByText('Chargement des activités…')).toBeTruthy();
  });

  it('shows error banner', () => {
    renderMap(<MapExperience activities={[]} error="Impossible de charger la carte" />);

    expect(screen.getByText('Impossible de charger la carte')).toBeTruthy();
  });

  it('shows empty state when filters match nothing', () => {
    renderMap(<MapExperience activities={[parisMuseum]} />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Rechercher un lieu, une activité…'),
      'zzz introuvable'
    );

    expect(screen.getByText('Aucun lieu trouvé')).toBeTruthy();
    expect(within(screen.getByTestId('map')).queryByTestId('pin-1')).toBeNull();
  });
});

// Keep top-level RN imports referenced so eslint does not flag unused imports when
// mock factories use jest.requireActual instead (Jest hoisting constraint).
void Pressable;
void View;
void Text;
