/**
 * auth.js — Auth0 SPA guard for the Decap CMS admin panel.
 *
 * Flow:
 *   1. Initialise Auth0 with config injected at build time (window.__AUTH0_CONFIG__).
 *   2. Redirect to Auth0 login if not authenticated.
 *   3. After login, extract the https://gfcba.com/github_token claim from the ID token.
 *   4. Dispatch `auth0:ready` with the token — index.astro injects it into
 *      Decap CMS's Redux store so the GitHub login screen is never shown.
 *
 * Required Auth0 Action (Post Login):
 *   exports.onExecutePostLogin = async (event, api) => {
 *     api.idToken.setCustomClaim('https://gfcba.com/github_token', event.user.app_metadata.github_pat);
 *   };
 */

(async function () {
  function showError(title, detail) {
    const el = document.getElementById('auth-loading');
    if (el) {
      el.style.display = 'flex';
      el.innerHTML =
        '<h2 style="color:#dc2626;font-family:system-ui,sans-serif">' + title + '</h2>' +
        '<p style="font-family:system-ui,sans-serif;color:#374151;max-width:480px">' + detail + '</p>';
    }
  }

  function showLoading() {
    const el = document.getElementById('auth-loading');
    if (el) el.style.display = 'flex';
  }

  console.log('[auth.js] script started');
  console.log('[auth.js] decap-cms-user in localStorage:', window.localStorage.getItem('decap-cms-user'));

  // ── Fast path: reuse an existing validated session from localStorage ────────
  // This prevents the loading screen from flashing on every page load / HMR
  // cycle once the user is already signed in.
  try {
    const cached = JSON.parse(window.localStorage.getItem('decap-cms-user') || 'null');
    console.log('[auth.js] cached session:', cached ? { backendName: cached.backendName, hasToken: !!cached.token } : null);
    if (cached && cached.token && cached.backendName === 'github') {
      console.log('[auth.js] fast-path: valid cached session found, setting window.__auth0Token');
      // Store token on window so index.astro can pick it up regardless of script order.
      window.__auth0Token = cached.token;
      // Also dispatch for any listener already registered.
      window.dispatchEvent(new CustomEvent('auth0:ready', { detail: { token: cached.token } }));
      return;
    }
    console.log('[auth.js] fast-path: no valid cached session, proceeding with Auth0 full flow');
  } catch (cacheErr) {
    console.warn('[auth.js] failed to parse cached session:', cacheErr);
  }

  // ── 1. Guard: ensure config was injected by the Astro build ────────────────
  showLoading();
  const config = window.__AUTH0_CONFIG__;
  console.log('[auth.js] Auth0 config:', config);
  if (!config || !config.domain || !config.clientId ||
      config.domain === '' || config.clientId === '') {
    showError(
      'Auth0 not configured',
      'Set <code>PUBLIC_AUTH0_DOMAIN</code> and <code>PUBLIC_AUTH0_CLIENT_ID</code> ' +
      'in your <strong>.env</strong> file, then rebuild. ' +
      'See <strong>.env.example</strong> for all required variables.'
    );
    return;
  }

  try {
    // ── 2. Initialise Auth0 SPA client ────────────────────────────────────────
    const auth0 = await window.auth0.createAuth0Client({
      domain:   config.domain,
      clientId: config.clientId,
      authorizationParams: {
        redirect_uri: config.redirectUri,
        ...(config.audience ? { audience: config.audience } : {}),
      },
      cacheLocation: 'localstorage',
    });

    // ── 3. Handle redirect callback after Auth0 login ─────────────────────────
    if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
      try {
        await auth0.handleRedirectCallback();
      } catch (cbErr) {
        // Stale or replayed callback — clear params and continue; a fresh
        // isAuthenticated() check will redirect to login if truly unauthenticated.
        console.warn('[auth.js] handleRedirectCallback error (ignored):', cbErr);
      }
      window.history.replaceState({}, document.title, '/admin/');
    }

    // ── 4. Check authentication ───────────────────────────────────────────────
    const isAuthenticated = await auth0.isAuthenticated();
    console.log('[auth.js] isAuthenticated:', isAuthenticated);
    if (!isAuthenticated) {
      console.log('[auth.js] not authenticated, redirecting to Auth0 login');
      await auth0.loginWithRedirect();
      return;
    }

    // ── 5. Extract GitHub PAT from the ID token custom claim ──────────────────
    const claims    = await auth0.getIdTokenClaims();
    const githubPAT = claims && claims['https://gfcba.com/github_token'];

    if (!githubPAT) {
      showError(
        'GitHub PAT not found',
        'No <code>https://gfcba.com/github_token</code> claim in the Auth0 ID token. ' +
        'Ensure your Auth0 Post-Login Action sets this claim from ' +
        '<code>event.user.app_metadata.github_pat</code>.'
      );
      return;
    }

    // ── 6. Signal to index.astro that auth is complete ───────────────────────
    console.log('[auth.js] dispatching auth0:ready (full Auth0 flow)');
    window.dispatchEvent(new CustomEvent('auth0:ready', { detail: { token: githubPAT } }));

  } catch (err) {
    console.error('[auth.js] unexpected error:', err);
    showError(
      'Authentication error',
      (err && err.message ? err.message : String(err)) +
      '<br><br>Open the browser console for details.'
    );
  }
})();
