import { render, screen, fireEvent, cleanup } from '@testing-library/react-native';
import { ActivityPickerSheet } from '@/components/social/ActivityPickerSheet';
import type { ApiActivity } from '@/types';

// Préfixe `mock` requis : jest hoiste les factories `jest.mock` au-dessus des consts.
const mockMusee: ApiActivity = {
  id: 1,
  name: 'Musée d’Orsay',
  description: '',
  latitude: 48.86,
  longitude: 2.32,
  city: 'Paris',
  category: 'Musée',
  price: null,
  imageUrl: null,
  dateStart: null,
  dateEnd: null,
};
const mockParc: ApiActivity = { ...mockMusee, id: 2, name: 'Parc de la Tête d’Or', city: 'Lyon' };

jest.mock('@/hooks/useFavorites', () => ({
  useFavorites: () => ({ favorites: [mockMusee, mockParc] }),
}));

jest.mock('@/hooks/useActivities', () => ({
  useActivities: () => ({ data: [mockMusee, mockParc] }),
}));

jest.mock('@/context/ThemeContext', () => ({
  useOdosColors: () => ({
    background: '#fff',
    surface: '#f5f5f5',
    elevated: '#fff',
    text: '#111',
    muted: '#666',
    border: '#ddd',
    accent: '#7c3aed',
    onAccent: '#fff',
    danger: '#ef4444',
  }),
}));

afterEach(cleanup);

describe('ActivityPickerSheet', () => {
  it('lists favorites by default', () => {
    render(<ActivityPickerSheet visible onClose={jest.fn()} onSelect={jest.fn()} />);
    expect(screen.getByText('Musée d’Orsay')).toBeTruthy();
    expect(screen.getByText('Parc de la Tête d’Or')).toBeTruthy();
  });

  it('filters by query and returns the chosen activity', () => {
    const onSelect = jest.fn();
    render(<ActivityPickerSheet visible onClose={jest.fn()} onSelect={onSelect} />);
    fireEvent.changeText(screen.getByPlaceholderText('Rechercher une activité…'), 'lyon');
    expect(screen.queryByText('Musée d’Orsay')).toBeNull();
    fireEvent.press(screen.getByText('Parc de la Tête d’Or'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }));
  });
});
