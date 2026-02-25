/**
 * Auth0 Auth Provider for TinaCMS
 *
 * This module provides a TinaCMS-compatible auth provider that:
 * 1. Uses Auth0 SPA SDK for authentication
 * 2. Extracts the GitHub PAT from the Auth0 claim: https://gfcba.com/github_token
 * 3. Returns the GitHub PAT as the TinaCMS token (so CMS can commit to GitHub)
 *
 * In development mode, falls back to localStorage 'tinacms-github-token' or
 * the GITHUB_PAT already stored there by the admin wrapper page.
 */

const TOKEN_STORAGE_KEY = "tinacms-github-token";
const USER_STORAGE_KEY = "tinacms-auth-user";

/**
 * Reads the token that the public/admin/index.html Auth0 wrapper stored
 * in localStorage after a successful Auth0 login.
 */
export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    sessionStorage.getItem(TOKEN_STORAGE_KEY) ||
    localStorage.getItem(TOKEN_STORAGE_KEY) ||
    null
  );
}

export function getStoredUser(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(USER_STORAGE_KEY);
}

/**
 * TinaCMS auth provider object.
 * Drop this into `defineConfig({ authProvider: auth0Provider })`.
 *
 * Implements all required methods of the TinaCMS `AuthProvider` interface.
 */
export const auth0Provider = {
  async getToken() {
    const token = getStoredToken();
    if (!token) return null;
    // TinaCMS expects { id_token: string }
    return { id_token: token };
  },

  async getUser() {
    return getStoredUser();
  },

  async authenticate(_props?: Record<string, any>) {
    // Redirect to the admin wrapper which handles Auth0 login
    if (typeof window !== 'undefined') {
      window.location.href = '/admin/';
    }
    return null;
  },

  async fetchWithToken(
    input: RequestInfo,
    init?: RequestInit
  ): Promise<Response> {
    const token = getStoredToken();
    const headers = new Headers((init?.headers as HeadersInit) || {});
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    return fetch(input, { ...init, headers });
  },

  async isAuthorized(): Promise<boolean> {
    return !!getStoredToken();
  },

  async isAuthenticated(): Promise<boolean> {
    return !!getStoredUser();
  },

  getLoginStrategy() {
    // Auth0 uses a full-page redirect flow
    return 'Redirect' as const;
  },

  getLoginScreen() {
    // No custom login screen; redirect to Auth0 is handled by public/admin/index.html
    return null;
  },

  getSessionProvider() {
    // Session is managed by Auth0 in public/admin/index.html — return a no-op passthrough
    return (({ children }: { children?: unknown }) => children) as any;
  },

  async logout() {
    clearStoredAuth();
    // Redirect to Auth0 logout
    const domain = (window as any).__AUTH0_DOMAIN__;
    const clientId = (window as any).__AUTH0_CLIENT_ID__;
    if (domain && clientId) {
      const logoutUrl =
        `https://${domain}/v2/logout` +
        `?client_id=${clientId}` +
        `&returnTo=${encodeURIComponent(window.location.origin + "/")}`;
      window.location.href = logoutUrl;
    } else {
      window.location.href = "/";
    }
  },

  async authorize() {
    // If we already have a token, we're authorized
    const token = getStoredToken();
    if (token) {
      return { id_token: token };
    }
    // Otherwise redirect to the Admin wrapper which will handle Auth0 login
    window.location.href = "/admin/";
    return null;
  },
};
