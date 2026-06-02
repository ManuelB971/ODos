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
});
