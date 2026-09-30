import { Database } from '@studiohouse/db';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { createApp } from './app';
import {
  TokenVerifier,
  verifierFromEnv,
  verifyBearer,
} from './lib/verify-token';

const ISSUER = 'https://auth.example.test';
const ORIGIN = 'http://localhost:4200';

let verifier: TokenVerifier;
let sign: (
  claims: Record<string, unknown>,
  opts?: { issuer?: string; expired?: boolean },
) => Promise<string>;

beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('EdDSA');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'test', alg: 'EdDSA' };
  verifier = { getKey: createLocalJWKSet({ keys: [jwk] }), issuer: ISSUER };
  sign = async (claims, opts = {}) => {
    const jwt = new SignJWT(claims)
      .setProtectedHeader({ alg: 'EdDSA', kid: 'test' })
      .setIssuer(opts.issuer ?? ISSUER)
      .setAudience(opts.issuer ?? ISSUER)
      .setIssuedAt();
    return jwt.setExpirationTime(opts.expired ? '-1m' : '15m').sign(privateKey);
  };
});

describe('verifyBearer', () => {
  it('accepts a valid EdDSA token from the expected issuer', async () => {
    const token = await sign({ sub: 'user_1', email: 'a@b.test', name: 'A' });
    await expect(verifyBearer(`Bearer ${token}`, verifier)).resolves.toEqual({
      id: 'user_1',
      email: 'a@b.test',
      name: 'A',
    });
  });

  it('rejects a missing header, wrong issuer, and expired token', async () => {
    await expect(verifyBearer(undefined, verifier)).rejects.toThrow(
      'Missing bearer token',
    );
    const wrongIssuer = await sign(
      { sub: 'u', email: 'e' },
      { issuer: 'https://other' },
    );
    await expect(
      verifyBearer(`Bearer ${wrongIssuer}`, verifier),
    ).rejects.toThrow('Invalid or expired token');
    const expired = await sign({ sub: 'u', email: 'e' }, { expired: true });
    await expect(verifyBearer(`Bearer ${expired}`, verifier)).rejects.toThrow(
      'Invalid or expired token',
    );
  });

  it('rejects a token without subject or email', async () => {
    const token = await sign({ sub: 'u' });
    await expect(verifyBearer(`Bearer ${token}`, verifier)).rejects.toThrow(
      'missing subject or email',
    );
  });
});

describe('verifierFromEnv', () => {
  it('derives the issuer from the auth base URL origin', () => {
    const v = verifierFromEnv({
      NEON_AUTH_BASE_URL: 'https://ep-x.neonauth.example/neondb/auth',
      NEON_AUTH_JWKS_URL:
        'https://ep-x.neonauth.example/neondb/auth/.well-known/jwks.json',
    } as NodeJS.ProcessEnv);
    expect(v.issuer).toBe('https://ep-x.neonauth.example');
  });

  it('fails fast without a JWKS URL', () => {
    expect(() => verifierFromEnv({} as NodeJS.ProcessEnv)).toThrow(
      'NEON_AUTH_JWKS_URL',
    );
  });
});

describe('app', () => {
  const db = {} as Database;
  const app = () => createApp({ db, verifier, allowedOrigins: [ORIGIN] });

  it('serves /health without auth', async () => {
    const res = await app().request('/health');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  it('returns 401 for /me without a token', async () => {
    const res = await app().request('/me');
    expect(res.status).toBe(401);
    await expect(res.json()).resolves.toEqual({
      error: 'Missing bearer token',
    });
  });

  it('answers CORS preflight only for allowed origins', async () => {
    const preflight = (origin: string) =>
      app().request('/me', {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Authorization',
        },
      });
    const ok = await preflight(ORIGIN);
    expect(ok.headers.get('access-control-allow-origin')).toBe(ORIGIN);
    expect(ok.headers.get('access-control-allow-headers')).toContain(
      'Authorization',
    );
    const denied = await preflight('https://evil.test');
    expect(denied.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('hides internal errors', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const token = await sign({ sub: 'user_1', email: 'a@b.test' });
    // An empty db object makes getMe throw; the client must not see details.
    const res = await app().request('/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(500);
    await expect(res.json()).resolves.toEqual({ error: 'Internal error' });
  });
});
