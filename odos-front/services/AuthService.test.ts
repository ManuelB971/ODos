const mockApi = {
  post: jest.fn(),
  get: jest.fn(),
  defaults: { baseURL: 'http://localhost:8000' },
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
      data: { token: 'token-123', refresh_token: 'refresh-456' },
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
      },
    });
    expect(mockSafeStorage.setItem).toHaveBeenCalledWith('user_token', 'token-123');
    expect(mockSafeStorage.setItem).toHaveBeenCalledWith('refresh_token', 'refresh-456');
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

  it('signUp returns detailed message when server is unreachable', async () => {
    mockApi.post.mockRejectedValueOnce({
      isAxiosError: true,
      message: 'Network Error',
      response: undefined,
    });

    const { signUp } = authService();
    const result = await signUp('new@odos.app', 'secret12');

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
    const result = await signUp('new@odos.app', 'secret12');

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Bad thing.');
  });

  it('signOut removes tokens', async () => {
    mockSafeStorage.deleteItem.mockResolvedValue(undefined);

    const { signOut } = authService();
    const result = await signOut();

    expect(result).toEqual({ success: true, errorMessage: null });
    expect(mockSafeStorage.deleteItem).toHaveBeenCalledWith('user_token');
    expect(mockSafeStorage.deleteItem).toHaveBeenCalledWith('refresh_token');
  });
});
