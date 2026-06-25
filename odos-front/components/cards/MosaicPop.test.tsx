import React from 'react';
import { render, cleanup } from '@testing-library/react-native';
import { MosaicPopCard, MosaicPopRow } from './MosaicPopCard';
import { MosaicPopMap } from './MosaicPopMap';
import type { ApiActivity } from '@/types';

const item = {
  id: 1,
  name: 'Test',
  description: 'desc',
  category: 'Sport',
  city: 'Paris',
  price: 10,
  ratingAverage: 4.2,
  imageUrl: null,
  latitude: 1,
  longitude: 1,
  isPublished: true,
} as unknown as ApiActivity;

jest.mock('expo-router', () => ({
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

// La carte branche désormais le favori + l'ajout à un parcours (audit multi-accès).
// On les neutralise ici pour garder un test de rendu pur, sans providers réseau.
jest.mock('@/hooks/useFavoriteToggle', () => ({
  useFavoriteToggle: () => ({
    favoriteIds: [],
    isFavorite: () => false,
    toggleFavorite: jest.fn(),
    canFavorite: true,
    isPending: false,
  }),
}));

jest.mock('@/components/social/ParcoursPickerSheet', () => ({
  ParcoursPickerSheet: () => null,
}));

afterEach(cleanup);

describe('Mosaïque pop', () => {
  it('renders the list row', () => {
    expect(() => render(<MosaicPopRow item={item} />)).not.toThrow();
  });

  it('renders the carousel card', () => {
    expect(() => render(<MosaicPopCard item={item} />)).not.toThrow();
  });

  it('renders the compact grid card', () => {
    expect(() => render(<MosaicPopCard item={item} variant="grid" />)).not.toThrow();
  });

  it('renders the full-width featured card', () => {
    expect(() => render(<MosaicPopCard item={item} variant="featured" />)).not.toThrow();
  });

  // Régression : sur l'accueil en style « Mosaïque pop », la zone carte est
  // ce visuel statique (et non MapLibre, qui faisait planter la home).
  it('renders the stylised map preview without crashing', () => {
    expect(() => render(<MosaicPopMap count={18} onPress={() => {}} />)).not.toThrow();
  });
});
