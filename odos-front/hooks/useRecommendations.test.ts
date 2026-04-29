import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

import { useRecommendations } from '@/hooks/useRecommendations';
import { fetchRecommendations } from '@/scripts/api';

const mockUseAuth = jest.fn();
const mockToAppError = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@/scripts/api', () => ({
  fetchRecommendations: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

jest.mock('@/utils/errorHandling', () => ({
  toAppError: (...args: unknown[]) => mockToAppError(...args),
}));

describe('useRecommendations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 42 } });
    mockToAppError.mockReturnValue({ userMessage: 'friendly error' });
  });

  it('configures query with user-aware cache key and enabled flag', () => {
    const refetch = jest.fn();
    (useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: null,
      refetch,
    });

    const { result } = renderHook(() => useRecommendations(['Sport']));

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['recommendations', 42, ['Sport']],
      queryFn: fetchRecommendations,
      enabled: true,
      staleTime: 1000 * 60 * 2,
      retry: 1,
    });
    expect(result.current.recommendations).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.refresh).toBe(refetch);
  });

  it('returns empty recommendations when interests are empty', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: [{ id: 1 }],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useRecommendations([]));

    expect((useQuery as jest.Mock).mock.calls[0][0].enabled).toBe(false);
    expect(result.current.recommendations).toEqual([]);
  });

  it('maps query errors to user message', () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('boom'),
      refetch: jest.fn(),
    });

    const { result } = renderHook(() => useRecommendations(['Food']));

    expect(mockToAppError).toHaveBeenCalled();
    expect(result.current.error).toBe('friendly error');
  });
});
