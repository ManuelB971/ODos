import React, { createContext, useCallback, useContext, useState } from 'react';
import type { BadgeItem } from '@/types';

type BadgeUnlockContextValue = {
  pendingUnlock: BadgeItem | null;
  showUnlock: (badge: BadgeItem) => void;
  dismissUnlock: () => void;
  mergeUnlocked: (badges: BadgeItem[]) => void;
};

const BadgeUnlockContext = createContext<BadgeUnlockContextValue>({
  pendingUnlock: null,
  showUnlock: () => {},
  dismissUnlock: () => {},
  mergeUnlocked: () => {},
});

export function BadgeUnlockProvider({ children }: { children: React.ReactNode }) {
  const [pendingUnlock, setPendingUnlock] = useState<BadgeItem | null>(null);

  const showUnlock = useCallback((badge: BadgeItem) => {
    setPendingUnlock(badge);
  }, []);

  const dismissUnlock = useCallback(() => {
    setPendingUnlock(null);
  }, []);

  const mergeUnlocked = useCallback((badges: BadgeItem[]) => {
    const first = badges.find((b) => b.isUnseen !== false) ?? badges[0];
    if (first) {
      setPendingUnlock(first);
    }
  }, []);

  return (
    <BadgeUnlockContext.Provider value={{ pendingUnlock, showUnlock, dismissUnlock, mergeUnlocked }}>
      {children}
    </BadgeUnlockContext.Provider>
  );
}

export function useBadgeUnlock() {
  return useContext(BadgeUnlockContext);
}
