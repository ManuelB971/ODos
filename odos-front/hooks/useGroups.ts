import { useQuery } from '@tanstack/react-query';
import { fetchGroups } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';

export function useGroups(tab: 'mine' | 'discover' = 'mine', page = 1) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['groups', tab, page],
    queryFn: () => fetchGroups(tab, page),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}
