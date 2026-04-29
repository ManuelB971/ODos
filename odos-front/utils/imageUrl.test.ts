describe('resolveImageUrl', () => {
  const originalApiUrl = process.env.EXPO_PUBLIC_API_URL;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const importModule = () => require('@/utils/imageUrl') as typeof import('@/utils/imageUrl');

  afterEach(() => {
    process.env.EXPO_PUBLIC_API_URL = originalApiUrl;
    jest.resetModules();
  });

  it('returns null for empty values', () => {
    const { resolveImageUrl } = importModule();

    expect(resolveImageUrl(null)).toBeNull();
    expect(resolveImageUrl(undefined)).toBeNull();
    expect(resolveImageUrl('   ')).toBeNull();
  });

  it('keeps absolute URLs unchanged', () => {
    const { resolveImageUrl } = importModule();
    expect(resolveImageUrl('https://cdn.site.dev/a.jpg')).toBe('https://cdn.site.dev/a.jpg');
    expect(resolveImageUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('builds absolute URL from relative path and env base URL', () => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.odos.app/';
    const { resolveImageUrl } = importModule();

    expect(resolveImageUrl('/uploads/activities/a.jpg')).toBe('https://api.odos.app/uploads/activities/a.jpg');
    expect(resolveImageUrl('uploads/activities/b.jpg')).toBe('https://api.odos.app/uploads/activities/b.jpg');
  });

  it('falls back to localhost when env is missing', () => {
    delete process.env.EXPO_PUBLIC_API_URL;
    const { resolveImageUrl } = importModule();

    expect(resolveImageUrl('/uploads/a.jpg')).toBe('http://localhost:8000/uploads/a.jpg');
  });
});
