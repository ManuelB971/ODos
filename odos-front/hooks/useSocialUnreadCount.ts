import { useQuery } from '@tanstack/react-query';
import { fetchSocialUnreadCount } from '@/scripts/api';
import { useAuth } from '@/context/AuthContext';

export const SOCIAL_UNREAD_QUERY_KEY = ['socialUnreadCount'] as const;

export function useSocialUnreadCount() {
  const { isAuthenticated, user } = useAuth();

  return useQuery({
    queryKey: SOCIAL_UNREAD_QUERY_KEY,
    queryFn: fetchSocialUnreadCount,
    enabled: isAuthenticated && !!user?.socialConsentedAt,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
