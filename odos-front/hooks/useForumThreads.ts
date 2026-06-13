import { useQuery } from '@tanstack/react-query';
import { fetchForumThreads } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';

export function useForumThreads(page = 1) {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['forumThreads', page],
    queryFn: () => fetchForumThreads({ page }),
    enabled: isAuthenticated,
    staleTime: 60_000,
  });
}
