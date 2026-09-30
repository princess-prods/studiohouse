import {
  JWTPayload,
  JWTVerifyGetKey,
  JWTVerifyOptions,
  createRemoteJWKSet,
  jwtVerify,
} from 'jose';

/** Claims we rely on from a Neon Auth JWT. */
export interface VerifiedUser {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
}

export class UnauthorizedError extends Error {
  readonly status = 401;
}

export interface TokenVerifier {
  /** Key resolver: Neon Auth's JWKS in production, a local key in tests. */
  readonly getKey: JWTVerifyGetKey;
  /**
   * Expected `iss`/`aud`: Managed Auth uses the auth host origin
   * (`NEON_AUTH_BASE_URL` without its path).
   */
  readonly issuer?: string;
}

/**
 * Builds the verifier from the env Neon injects into every Function on a
 * branch with Managed Auth enabled (`NEON_AUTH_JWKS_URL`, `NEON_AUTH_BASE_URL`).
 * Call once at module scope; the JWKS is cached by `jose`.
 */
export function verifierFromEnv(env = process.env): TokenVerifier {
  const jwksUrl = env['NEON_AUTH_JWKS_URL'];
  if (!jwksUrl) {
    throw new Error(
      'NEON_AUTH_JWKS_URL is not set. Is Neon Auth enabled on this branch? Run `neon env pull`.',
    );
  }
  const baseUrl = env['NEON_AUTH_BASE_URL'];
  return {
    getKey: createRemoteJWKSet(new URL(jwksUrl)),
    issuer: baseUrl ? new URL(baseUrl).origin : undefined,
  };
}

/**
 * Verifies an `Authorization: Bearer <jwt>` header and returns the user it
 * identifies. Managed Auth signs with EdDSA and expires tokens in ~15 minutes.
 */
export async function verifyBearer(
  authorization: string | null | undefined,
  verifier: TokenVerifier,
): Promise<VerifiedUser> {
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) throw new UnauthorizedError('Missing bearer token');

  const options: JWTVerifyOptions = { algorithms: ['EdDSA'] };
  if (verifier.issuer) {
    options.issuer = verifier.issuer;
    options.audience = verifier.issuer;
  }

  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, verifier.getKey, options));
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }

  const id = payload.sub;
  const email = payload['email'];
  if (typeof id !== 'string' || typeof email !== 'string') {
    throw new UnauthorizedError('Token is missing subject or email');
  }
  const name = payload['name'];
  return { id, email, name: typeof name === 'string' ? name : null };
}
