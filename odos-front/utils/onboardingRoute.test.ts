import { getOnboardingRoute } from '@/utils/onboardingRoute';
import type { User } from '@/types';

describe('getOnboardingRoute', () => {
  const baseUser = {
    id: 1,
    email: 'a@b.com',
  } as NonNullable<User>;

  it('routes to interests when none selected', () => {
    expect(getOnboardingRoute({ ...baseUser, interests: [] })).toBe('/interests');
  });

  it('routes to city onboarding when homeCity missing', () => {
    expect(
      getOnboardingRoute({
        ...baseUser,
        interests: [{ id: 1, name: 'Sport' }],
        homeCity: null,
      }),
    ).toBe('/onboarding-city');
  });

  it('routes home when onboarding complete', () => {
    expect(
      getOnboardingRoute({
        ...baseUser,
        interests: [{ id: 1, name: 'Sport' }],
        homeCity: 'Lyon',
      }),
    ).toBe('/');
  });
});
