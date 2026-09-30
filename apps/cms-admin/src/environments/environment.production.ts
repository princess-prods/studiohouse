/**
 * Production environment: the Neon `production` branch.
 *
 * Fill `neonAuthUrl` from `neon neon-auth status --branch production` and
 * `apiBaseUrl` from `neon functions get cmsapi --branch production`
 * (the `invocation_url`, without a trailing slash).
 */
export const environment = {
  production: true,
  neonAuthUrl:
    'https://ep-purple-field-b4ohp9xv.neonauth.c-6.us-east-2.aws.neon.tech/neondb/auth',
  apiBaseUrl: 'https://REPLACE-WITH-CMSAPI-INVOCATION-URL',
};
