type JwtPayload = {
  exp?: number;
  [key: string]: unknown;
};

function base64UrlDecodeToString(input: string): string {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);

  // atob exists in RN (Hermes) and web; fallback is just to throw if missing.
  if (typeof atob !== 'function') {
    throw new Error('atob is not available in this runtime');
  }

  return atob(padded);
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const json = base64UrlDecodeToString(parts[1]);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, clockSkewSeconds = 30): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return false; // if no exp, treat as non-expiring
  const now = Math.floor(Date.now() / 1000);
  return now >= payload.exp - clockSkewSeconds;
}

