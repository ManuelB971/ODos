import { useEffect } from 'react';

export function useFrameworkReady() {
  useEffect(() => {
    try {
      const g = globalThis as typeof globalThis & { frameworkReady?: () => void };
      g.frameworkReady?.();
    } catch {
      /* Hermes/Android : pas de `window`; hook safe pour APK */
    }
  });
}
