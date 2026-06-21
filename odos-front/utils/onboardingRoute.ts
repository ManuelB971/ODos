import type { Href } from 'expo-router';

import type { User } from '@/types';

/** Route onboarding ville (cast requis tant que les types Expo Router ne sont pas regénérés). */
export const ONBOARDING_CITY_HREF = '/onboarding-city' as Href;

/** Route post-auth : intérêts → ville → accueil. */
export function getOnboardingRoute(user: NonNullable<User>): Href {
  const hasInterests = Array.isArray(user.interests) && user.interests.length > 0;
  if (!hasInterests) return '/interests' as Href;

  const homeCity = user.homeCity?.trim();
  if (!homeCity) return ONBOARDING_CITY_HREF;

  return '/' as Href;
}

export function hasCompletedOnboarding(user: NonNullable<User>): boolean {
  return getOnboardingRoute(user) === '/';
}
