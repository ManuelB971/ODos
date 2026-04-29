import { useQuery } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';

import { useActivities } from '@/hooks/useActivities';
import { fetchActivities } from '@/scripts/api';

jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
}));

jest.mock('@/scripts/api', () => ({
  fetchActivities: jest.fn(),
}));

describe('useActivities', () => {
  it('configures react-query with expected options', () => {
    (useQuery as jest.Mock).mockReturnValue({ data: [], isLoading: false });

    renderHook(() => useActivities());

    expect(useQuery).toHaveBeenCalledWith({
      queryKey: ['activities'],
      queryFn: fetchActivities,
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 15,
      retry: 2,
    });
  });
});
