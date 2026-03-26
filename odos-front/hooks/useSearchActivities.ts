import { useMemo, useState } from 'react';
import { useActivities } from '@/hooks/useActivities';
import { useDebounce } from '@/hooks/useDebounce';
import type { ApiActivity } from '@/types';

const getCategoryName = (cat: ApiActivity['category']): string => {
  if (typeof cat === 'string') return cat;
  if (cat && typeof cat === 'object' && 'name' in cat) return cat.name;
  return '';
};

export function useSearchActivities() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedQuery = useDebounce(searchQuery, 250);
  const activitiesQuery = useActivities();

  const filteredActivities = useMemo(() => {
    const activities = activitiesQuery.data ?? [];
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return [];

    return activities.filter((activity) =>
      activity.name.toLowerCase().includes(q) ||
      getCategoryName(activity.category).toLowerCase().includes(q) ||
      activity.description.toLowerCase().includes(q) ||
      (activity.city ?? '').toLowerCase().includes(q)
    );
  }, [activitiesQuery.data, debouncedQuery]);

  return {
    searchQuery,
    setSearchQuery,
    filteredActivities,
    isLoading: activitiesQuery.isLoading,
    error: activitiesQuery.error,
  };
}
