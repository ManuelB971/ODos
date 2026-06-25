const mockApi = {
  post: jest.fn(),
  get: jest.fn(),
  defaults: { baseURL: 'http://localhost:8000', headers: { common: {} as Record<string, string> } },
};

const mockSafeStorage = {
  setItem: jest.fn(),
  deleteItem: jest.fn(),
};

jest.mock('@/scripts/api', () => ({
  __esModule: true,
  default: mockApi,
  safeStorage: mockSafeStorage,
}));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const authService = () => require('@/services/AuthService') as typeof import('@/services/AuthService');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signIn stores tokens and returns normalized user', async () => {
    mockApi.post.mockResolvedValueOnce({
      data: { token: 'token-123456', refresh_token: 'refresh-456789' },
    });
    mockApi.get.mockResolvedValueOnce({
      data: {
        id: 8,
        email: 'test@odos.app',
        alias: 'tester',
        displayName: 'Test User',
        avatarUrl: '/avatar.png',
        bio: 'bio',
        interests: ['/api/interests/1'],
      },
    });

    const { signIn } = authService();
    const result = await signIn('test@odos.app', 'secret');

    expect(result).toEqual({
      success: true,
      errorMessage: null,
      user: {
        id: 8,
        email: 'test@odos.app',
        alias: 'tester',
        displayName: 'Test User',
        avatarUrl: '/avatar.png',
        bio: 'bio',
        interests: ['/api/interests/1'],
        hideBadgesOnProfile: false,
        mapExplorationEnabled: false,
        profilePublic: true,
        socialConsentedAt: null,
        homeCity: null,
      },
    });
    expect(mockSafeStorage.setItem).toHaveBeenCalledWith('user_token', 'token-123456');
    expect(mockSafeStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-456789');
    expect(mockApi.get).toHaveBeenCalledWith('/api/me');
  });

  it('signIn returns user-friendly error on failure', async () => {
    mockApi.post.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Request failed with status code 401',
      response: { status: 401 },
    });

    const { signIn } = authService();
    const result = await signIn('test@odos.app', 'wrong');

    expect(result.success).toBe(false);
    expect(result.user).toBeNull();
    expect(result.errorMessage).toContain('Session expirée');
  });

  it('signUp registers then auto signIn stores tokens and returns user', async () => {
    mockApi.post
      .mockResolvedValueOnce({ data: { id: 9, email: 'new@odos.app' } })
      .mockResolvedValueOnce({
        data: { token: 'access-new-99', refresh_token: 'refresh-new-99' },
      });
    mockApi.get.mockResolvedValueOnce({
      data: {
        id: 9,
        email: 'new@odos.app',
        alias: null,
        displayName: 'new',
        avatarUrl: null,
        bio: null,
        interests: [],
      },
    });

    const { signUp } = authService();
    const result = await signUp('new@odos.app', 'secret12', true);

    expect(result.success).toBe(true);
    expect(result.user?.email).toBe('new@odos.app');
    expect(mockApi.post).toHaveBeenNthCalledWith(
      1,
      '/api/users',
      expect.objectContaining({ acceptTerms: true }),
    );
    expect(mockApi.post).toHaveBeenNthCalledWith(2, '/api/login', {
      email: 'new@odos.app',
      password: 'secret12',
    });
    expect(mockSafeStorage.setItem).toHaveBeenCalledWith('user_token', 'access-new-99');
    expect(mockSafeStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-new-99');
  });

  it('signUp returns detailed message when server is unreachable', async () => {
    mockApi.post.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Network Error',
      response: undefined,
    });

    const { signUp } = authService();
    const result = await signUp('new@odos.app', 'secret12', true);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toContain('Impossible de joindre le serveur');
    expect(result.errorMessage).toContain('http://localhost:8000');
  });

  it('signUp returns API message on HTTP 400 instead of network wording', async () => {
    mockApi.post.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Request failed with status code 400',
      response: { status: 400, data: { message: 'Bad thing.' } },
    });

    const { signUp } = authService();
    const result = await signUp('new@odos.app', 'secret12', true);

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Bad thing.');
    expect(mockApi.post).toHaveBeenCalledWith('/api/users', expect.objectContaining({ acceptTerms: true }));
  });

  it('signOut invalidates server session and removes tokens', async () => {
    mockApi.post.mockResolvedValueOnce({ data: { message: 'Déconnecté.' } });
    mockSafeStorage.deleteItem.mockResolvedValue(undefined);

    const { signOut } = authService();
    const result = await signOut();

    expect(result).toEqual({ success: true, errorMessage: null });
    expect(mockApi.post).toHaveBeenCalledWith('/api/logout');
    expect(mockSafeStorage.deleteItem).toHaveBeenCalledWith('user_token');
    expect(mockSafeStorage.deleteItem).toHaveBeenCalledWith('refresh_token');
  });
});
