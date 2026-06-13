import { useQuery } from '@tanstack/react-query';
import { searchUsers } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';
import { useDebounce } from '@/hooks/useDebounce';

export const USER_SEARCH_QUERY_KEY = ['userSearch'] as const;

export function useUserSearch(query: string) {
  const { isAuthenticated, user } = useAuth();
  const debounced = useDebounce(query.trim(), 300);

  return useQuery({
    queryKey: [...USER_SEARCH_QUERY_KEY, debounced],
    queryFn: () => searchUsers(debounced),
    enabled: isAuthenticated && !!user?.socialConsentedAt && debounced.length >= 2,
    staleTime: 30_000,
  });
}
