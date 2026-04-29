import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

import { useFavorites } from '@/hooks/useFavorites';

const mockUseAuth = jest.fn();
const mockUseActivities = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/hooks/useActivities', () => ({
  useActivities: () => mockUseActivities(),
}));

describe('useFavorites', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    mockUseActivities.mockReturnValue({
      data: [
        { id: 1, name: 'A' },
        { id: 2, name: 'B' },
      ],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('returns activities matching favorite IDs', () => {
    const favoritesRefetch = jest.fn();
    (useQuery as jest.Mock).mockReturnValue({
      data: [2],
      isLoading: false,
      isError: false,
      error: null,
      refetch: favoritesRefetch,
    });

    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites.map((a: { id: number }) => a.id)).toEqual([2]);
  });

  it('disables favorites query when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    (useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: jest.fn(),
    });

    renderHook(() => useFavorites());

    expect(useQuery).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: false,
      })
    );
  });

  it('refetch triggers both queries', async () => {
    const activitiesRefetch = jest.fn(async () => undefined);
    const favoritesRefetch = jest.fn(async () => undefined);
    mockUseActivities.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: activitiesRefetch,
    });
    (useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: favoritesRefetch,
    });

    const { result } = renderHook(() => useFavorites());
    await result.current.refetch();

    expect(activitiesRefetch).toHaveBeenCalledTimes(1);
    expect(favoritesRefetch).toHaveBeenCalledTimes(1);
  });
});
