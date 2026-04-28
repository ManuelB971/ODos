// @ts-nocheck
/* eslint-disable @typescript-eslint/no-require-imports */
type AnyFn = (...args: any[]) => any;

let requestInterceptor: AnyFn | null = null;
let responseErrorInterceptor: AnyFn | null = null;

const mockApiInstance = Object.assign(jest.fn(), {
  get: jest.fn(),
  post: jest.fn(),
  patch: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  defaults: { headers: { common: {} as Record<string, string> } },
  interceptors: {
    request: {
      use: jest.fn((fn: AnyFn) => {
        requestInterceptor = fn;
        return 0;
      }),
    },
    response: {
      use: jest.fn((_ok: AnyFn, ko: AnyFn) => {
        responseErrorInterceptor = ko;
        return 0;
      }),
    },
  },
});

const mockAxios = {
  create: jest.fn(() => mockApiInstance),
  post: jest.fn(),
};

const mockSecureStore = {
  isAvailableAsync: jest.fn(async () => false),
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
};

jest.mock('axios', () => mockAxios);
jest.mock('expo-secure-store', () => mockSecureStore);

function loadApiModule() {
  return require('@/scripts/api') as typeof import('@/scripts/api');
}

describe('api helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    requestInterceptor = null;
    responseErrorInterceptor = null;
    mockSecureStore.isAvailableAsync.mockResolvedValue(false);
    mockApiInstance.mockResolvedValue({ data: { ok: true } });
  });

  it('extractFavoriteActivityIds parses mixed backend shapes', () => {
    const { extractFavoriteActivityIds } = loadApiModule();
    const input = [1, '/api/activities/2', '/3', { id: 4 }, { '@id': '/api/activities/5' }, { '@id': '/6' }];
    expect(extractFavoriteActivityIds(input)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(extractFavoriteActivityIds('x')).toEqual([]);
  });

  it('fetch helpers map hydra and raw payloads', async () => {
    const api = loadApiModule();
    mockApiInstance.get
      .mockResolvedValueOnce({ data: { 'hydra:member': [{ id: 1 }] } })
      .mockResolvedValueOnce({ data: [{ id: 2 }] })
      .mockResolvedValueOnce({ data: { member: [{ id: 3 }] } })
      .mockResolvedValueOnce({ data: { 'hydra:member': [{ id: 4 }] } })
      .mockResolvedValueOnce({ data: { favorites: ['/api/activities/8'] } })
      .mockResolvedValueOnce({ data: { avg: 4 } })
      .mockResolvedValueOnce({ data: { member: [], totalItems: 0, page: 1, itemsPerPage: 10 } });

    expect(await api.fetchCategories()).toEqual([{ id: 1 }]);
    expect(await api.fetchActivities()).toEqual([{ id: 2 }]);
    expect(await api.fetchActivities()).toEqual([{ id: 3 }]);
    expect(await api.fetchRecommendations()).toEqual([{ id: 4 }]);
    expect(await api.fetchFavoriteIds()).toEqual([8]);
    expect(await api.fetchActivityRating(7)).toEqual({ avg: 4 });
    expect(await api.fetchActivityComments(9, 2)).toEqual({ member: [], totalItems: 0, page: 1, itemsPerPage: 10 });
  });

  it('write helpers call expected endpoints', async () => {
    const api = loadApiModule();
    mockApiInstance.delete.mockResolvedValue({ data: { isFavorite: false } });
    mockApiInstance.post
      .mockResolvedValueOnce({ data: { isFavorite: true } })
      .mockResolvedValueOnce({ data: { avatarUrl: '/uploads/a.webp' } })
      .mockResolvedValueOnce({ data: { id: 5 } });
    mockApiInstance.put.mockResolvedValue({ data: { average: 5 } });
    mockApiInstance.patch.mockResolvedValue({ data: { id: 6 } });

    await api.updateUserInterests(1, ['/api/interests/1']);
    expect(mockApiInstance.patch).toHaveBeenCalledWith(
      '/api/users/1',
      { interests: ['/api/interests/1'] },
      { headers: { 'Content-Type': 'application/merge-patch+json' } }
    );

    expect(await api.toggleFavoriteActivity(12, false)).toEqual({ isFavorite: true });
    expect(await api.toggleFavoriteActivity(12, true)).toEqual({ isFavorite: false });

    await api.updateProfile(3, { alias: 'neo' });
    expect(mockApiInstance.patch).toHaveBeenCalledWith(
      '/api/users/3',
      { alias: 'neo' },
      { headers: { 'Content-Type': 'application/merge-patch+json' } }
    );

    expect(await api.uploadAvatar({ uri: 'file://a.jpg', name: 'a.jpg', mimeType: 'image/jpeg' })).toEqual({
      avatarUrl: '/uploads/a.webp',
    });

    await api.deleteAvatar();
    await api.deleteAccount(9);
    expect(await api.putActivityRating(4, 5)).toEqual({ average: 5 });
    await api.deleteActivityRating(4);
    expect(await api.postActivityComment(4, 'hello')).toEqual({ id: 5 });
    expect(await api.patchActivityComment(5, 'edit')).toEqual({ id: 6 });
    await api.deleteActivityComment(5);
  });

  it('safeStorage uses SecureStore when available', async () => {
    const { safeStorage } = loadApiModule();
    mockSecureStore.isAvailableAsync.mockResolvedValue(true);
    mockSecureStore.getItemAsync.mockResolvedValue('abc');

    expect(await safeStorage.getItem('k')).toBe('abc');
    await safeStorage.setItem('k', 'v');
    await safeStorage.deleteItem('k');

    expect(mockSecureStore.getItemAsync).toHaveBeenCalledWith('k');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('k', 'v');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('k');
  });

  it('request interceptor injects bearer token except refresh route', async () => {
    const { safeStorage } = loadApiModule();
    mockSecureStore.isAvailableAsync.mockResolvedValue(true);
    mockSecureStore.getItemAsync.mockResolvedValue('token-1');

    const cfg = { url: '/api/me', headers: {} as Record<string, string> };
    const refreshCfg = { url: '/api/token/refresh', headers: {} as Record<string, string> };

    expect(requestInterceptor).toBeTruthy();
    const withAuth = await requestInterceptor!(cfg);
    const noAuth = await requestInterceptor!(refreshCfg);

    expect(withAuth.headers.Authorization).toBe('Bearer token-1');
    expect(noAuth.headers.Authorization).toBeUndefined();
    expect(await safeStorage.getItem('x')).toBe('token-1');
  });

  it('response interceptor handles 401 without refresh token and notifies listeners', async () => {
    const api = loadApiModule();
    const listener = jest.fn();
    const unsubscribe = api.onAuthError(listener);
    mockSecureStore.isAvailableAsync.mockResolvedValue(true);
    mockSecureStore.getItemAsync.mockResolvedValue(null);

    const error = {
      response: { status: 401 },
      config: { url: '/api/me', headers: {} as Record<string, string> },
    };

    await expect(responseErrorInterceptor!(error)).rejects.toBe(error);
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalledWith('user_token');
    expect(listener).toHaveBeenCalled();
    unsubscribe();
  });

  it('response interceptor refreshes token and retries original request', async () => {
    loadApiModule();
    mockSecureStore.isAvailableAsync.mockResolvedValue(true);
    mockSecureStore.getItemAsync.mockResolvedValue('refresh-1');
    mockAxios.post.mockResolvedValue({
      data: { token: 'new-token', refresh_token: 'new-refresh' },
    });
    mockApiInstance.mockResolvedValue({ data: { retried: true } });

    const error = {
      response: { status: 401 },
      config: { url: '/api/private', headers: {} as Record<string, string> },
    };

    const result = await responseErrorInterceptor!(error);
    expect(result).toEqual({ data: { retried: true } });
    expect(mockAxios.post).toHaveBeenCalledWith('http://localhost:8000/api/token/refresh', {
      refresh_token: 'refresh-1',
    });
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('user_token', 'new-token');
    expect(mockSecureStore.setItemAsync).toHaveBeenCalledWith('refresh_token', 'new-refresh');
  });
});
