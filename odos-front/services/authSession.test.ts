import { mapMeResponseToUser } from '@/services/authSession';

describe('mapMeResponseToUser', () => {
  it('maps /api/me payload to User', () => {
    const user = mapMeResponseToUser({
      id: 1,
      email: 'a@b.fr',
      alias: 'alias',
      displayName: 'Display',
      avatarUrl: '/a.png',
      bio: 'bio',
      interests: [],
      hideBadgesOnProfile: true,
      mapExplorationEnabled: true,
    });

    expect(user).toMatchObject({
      id: 1,
      email: 'a@b.fr',
      alias: 'alias',
      hideBadgesOnProfile: true,
      mapExplorationEnabled: true,
    });
  });

  it('maps homeCity so onboarding is not re-triggered after reload', () => {
    expect(mapMeResponseToUser({ id: 1, email: 'a@b.fr', homeCity: 'Lyon' }).homeCity).toBe('Lyon');
    expect(mapMeResponseToUser({ id: 1, email: 'a@b.fr' }).homeCity).toBeNull();
  });
});
