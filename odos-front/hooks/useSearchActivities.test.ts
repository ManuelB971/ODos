import { act, renderHook } from '@testing-library/react-native';

import { useSearchActivities } from '@/hooks/useSearchActivities';
import type { ApiActivity } from '@/types';

const mockUseActivities = jest.fn();

jest.mock('@/hooks/useActivities', () => ({
  useActivities: () => mockUseActivities(),
}));

jest.mock('@/hooks/useDebounce', () => ({
  useDebounce: (value: string) => value,
}));

function activity(partial: Partial<ApiActivity>): ApiActivity {
  return {
    id: partial.id ?? 1,
    name: partial.name ?? 'Default',
    description: partial.description ?? 'Description',
    latitude: partial.latitude ?? 0,
    longitude: partial.longitude ?? 0,
    city: partial.city ?? null,
    category: partial.category ?? 'Other',
    price: partial.price ?? null,
    imageUrl: partial.imageUrl ?? null,
    dateStart: partial.dateStart ?? null,
    dateEnd: partial.dateEnd ?? null,
    isFavorite: partial.isFavorite,
    ratingAverage: partial.ratingAverage,
    ratingCount: partial.ratingCount,
    isPublished: partial.isPublished,
  };
}

describe('useSearchActivities', () => {
  beforeEach(() => {
    mockUseActivities.mockReturnValue({
      data: [
        activity({ id: 1, name: 'Kayak Sunset', description: 'River trip', city: 'Lyon', category: { id: 10, name: 'Sport' } }),
        activity({ id: 2, name: 'Museum Night', description: 'Art and history', city: 'Paris', category: 'Culture' }),
      ],
      isLoading: false,
      error: null,
    });
  });

  it('returns an empty list while query is blank', () => {
    const { result } = renderHook(() => useSearchActivities());
    expect(result.current.filteredActivities).toEqual([]);
  });

  it('filters activities by name, category, description and city', () => {
    const { result } = renderHook(() => useSearchActivities());

    act(() => result.current.setSearchQuery('kayak'));
    expect(result.current.filteredActivities.map((a) => a.id)).toEqual([1]);

    act(() => result.current.setSearchQuery('culture'));
    expect(result.current.filteredActivities.map((a) => a.id)).toEqual([2]);

    act(() => result.current.setSearchQuery('history'));
    expect(result.current.filteredActivities.map((a) => a.id)).toEqual([2]);

    act(() => result.current.setSearchQuery('lyon'));
    expect(result.current.filteredActivities.map((a) => a.id)).toEqual([1]);
  });
});
