import { useAuth0 } from '@auth0/auth0-react';

const GITHUB_TOKEN_CLAIM = 'https://gfcba.com/github_token';

/**
 * Returns the GitHub personal access token.
 *
 * - In development: reads PUBLIC_GITHUB_PAT from environment variables.
 * - In production: reads the token from the Auth0 ID token claim
 *   `https://gfcba.com/github_token`.
 */
export function useGitHubToken(): string | null {
  const { user } = useAuth0();

  // Dev: use the PAT from .env.development
  const devPat = import.meta.env.PUBLIC_GITHUB_PAT;
  if (devPat) {
    return devPat as string;
  }

  // Production: extract from Auth0 ID token claim
  if (user && GITHUB_TOKEN_CLAIM in user) {
    return (user as Record<string, unknown>)[GITHUB_TOKEN_CLAIM] as string;
  }

  return null;
}
