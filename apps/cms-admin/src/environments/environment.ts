/**
 * Development environment: the Neon `dev` branch.
 *
 * `neonAuthUrl` is the branch's Managed Auth base URL (public; the auth
 * server enforces trusted origins). `apiBaseUrl` is proxied to the local
 * `neon dev` server by `proxy.conf.json`. Production values are swapped in
 * via `fileReplacements` in project.json.
 */
export const environment = {
  production: false,
  neonAuthUrl:
    'https://ep-odd-brook-b4d7l1fr.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth',
  apiBaseUrl: '/api',
};
