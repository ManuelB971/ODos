import * as fs from 'fs';
import * as path from 'path';

import { fireEvent, render, screen, within } from '@testing-library/react-native';

import { MapExperience } from '@/components/map/MapExperience';
import type { ApiActivity } from '@/types';

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
  const React = require('react');
  const { Pressable, View } = require('react-native');

  const Marker = ({
    id,
    onPress,
    children,
  }: {
    id: string;
    onPress?: () => void;
    children?: React.ReactNode;
  }) => (
    <Pressable testID={id} onPress={onPress} accessibilityRole="button">
      {children}
    </Pressable>
  );

  const Map = ({ children }: { children?: React.ReactNode }) => (
    <View testID="map">{children}</View>
  );

  const Camera = React.forwardRef(function Camera(_props: unknown, _ref: unknown) {
    return null;
  });

  return { Map, Camera, Marker };
});

jest.mock('@/components/map/MapPin', () => ({
  MapPin: ({ active, label }: { active?: boolean; label?: string }) => {
    const { Text, View } = require('react-native');
    return (
      <View testID={active ? 'map-pin-active' : 'map-pin'}>
        {label ? <Text testID="map-pin-label">{label}</Text> : null}
      </View>
    );
  },
}));

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

  it('does not reintroduce bottom sheet, GL pin layer or horizontal list', () => {
    expect(source).not.toMatch(/BottomSheet/);
    expect(source).not.toMatch(/ActivityPinsLayer/);
    expect(source).not.toMatch(/\bFlatList\b/);
  });

  it('renders MapPin inside MapLibre Marker for each geo activity', () => {
    expect(source).toMatch(/<Marker[\s\S]*<MapPin/);
  });
});

describe('MapExperience', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders one marker per published geo-located activity', () => {
    render(<MapExperience activities={[parisMuseum, lyonPark]} />);

    expect(screen.getByTestId('pin-1')).toBeTruthy();
    expect(screen.getByTestId('pin-2')).toBeTruthy();
    expect(screen.getAllByTestId('map-pin')).toHaveLength(2);
  });

  it('skips unpublished or activities without coordinates', () => {
    render(
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
    render(<MapExperience activities={[parisMuseum, lyonPark]} />);

    expect(screen.queryByLabelText('Activité Musée du Louvre')).toBeNull();

    fireEvent.press(screen.getByTestId('pin-1'));
    expect(screen.getByLabelText('Activité Musée du Louvre')).toBeTruthy();
    expect(screen.getByTestId('map-pin-label')).toHaveTextContent('Musée du Louvre');

    fireEvent.press(screen.getByTestId('pin-1'));
    expect(screen.queryByLabelText('Activité Musée du Louvre')).toBeNull();
  });

  it('navigates to activity detail when callout is pressed', () => {
    render(<MapExperience activities={[parisMuseum]} />);

    fireEvent.press(screen.getByTestId('pin-1'));
    fireEvent.press(screen.getByLabelText('Activité Musée du Louvre'));

    expect(mockPush).toHaveBeenCalledWith('/activity/1');
  });

  it('filters markers via search text', () => {
    render(<MapExperience activities={[parisMuseum, lyonPark]} />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Rechercher un lieu, une activité…'),
      'Lyon'
    );

    expect(screen.queryByTestId('pin-1')).toBeNull();
    expect(screen.getByTestId('pin-2')).toBeTruthy();
  });

  it('filters markers via category chip', () => {
    render(<MapExperience activities={[parisMuseum, lyonPark]} />);

    fireEvent.press(screen.getByLabelText('Nature'));

    expect(screen.queryByTestId('pin-1')).toBeNull();
    expect(screen.getByTestId('pin-2')).toBeTruthy();
  });

  it('shows loading banner', () => {
    render(<MapExperience activities={[]} loading />);

    expect(screen.getByText('Chargement des activités…')).toBeTruthy();
  });

  it('shows error banner', () => {
    render(<MapExperience activities={[]} error="Impossible de charger la carte" />);

    expect(screen.getByText('Impossible de charger la carte')).toBeTruthy();
  });

  it('shows empty state when filters match nothing', () => {
    render(<MapExperience activities={[parisMuseum]} />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Rechercher un lieu, une activité…'),
      'zzz introuvable'
    );

    expect(screen.getByText('Aucun lieu trouvé')).toBeTruthy();
    expect(within(screen.getByTestId('map')).queryByTestId('pin-1')).toBeNull();
  });
});
