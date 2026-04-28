import { decodeJwtPayload, isJwtExpired } from '@/utils/jwt';

function toBase64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createToken(payload: Record<string, unknown>): string {
  const header = toBase64Url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = toBase64Url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

describe('jwt utils', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('decodes a valid payload', () => {
    const token = createToken({ sub: '42', exp: 2_000_000_000 });
    const payload = decodeJwtPayload(token);

    expect(payload).toMatchObject({ sub: '42', exp: 2_000_000_000 });
  });

  it('returns null for malformed token', () => {
    expect(decodeJwtPayload('not-a-jwt')).toBeNull();
  });

  it('returns true when token is expired (with skew)', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000_000 * 1000);
    const token = createToken({ exp: 1_000_020 });

    expect(isJwtExpired(token, 30)).toBe(true);
  });

  it('returns false when token has no exp', () => {
    const token = createToken({ sub: 'no-exp' });
    expect(isJwtExpired(token)).toBe(false);
  });
});
