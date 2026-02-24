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
  const config = window.__AUTH0_CONFIG__;

  // Guard: ensure config was injected by the Astro build
  if (!config || !config.domain || !config.clientId ||
      config.domain === '' || config.clientId === '') {
    document.getElementById('auth-loading').innerHTML = `
      <h2 style="color:#dc2626">Auth0 not configured</h2>
      <p>Set <code>PUBLIC_AUTH0_DOMAIN</code> and <code>PUBLIC_AUTH0_CLIENT_ID</code>
         in your <strong>.env</strong> file, then rebuild.</p>
      <p style="margin-top:8px">See <strong>.env.example</strong> for all required variables.</p>
    `;
    return;
  }

  // Initialise Auth0 SPA client
  const auth0 = await window.auth0.createAuth0Client({
    domain:   config.domain,
    clientId: config.clientId,
    authorizationParams: {
      redirect_uri: config.redirectUri,
      ...(config.audience ? { audience: config.audience } : {}),
    },
    cacheLocation: 'localstorage',
  });

  // Handle redirect callback after Auth0 login
  if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
    await auth0.handleRedirectCallback();
    window.history.replaceState({}, document.title, '/admin/');
  }

  const isAuthenticated = await auth0.isAuthenticated();

  if (!isAuthenticated) {
    await auth0.loginWithRedirect();
    return;
  }

  // Extract GitHub PAT from the Auth0 ID token custom claim
  const claims = await auth0.getIdTokenClaims();
  const githubPAT = claims?.['https://gfcba.com/github_token'];

  if (!githubPAT) {
    document.getElementById('auth-loading').innerHTML = `
      <h2 style="color:#dc2626">GitHub PAT not found</h2>
      <p>No <code>https://gfcba.com/github_token</code> claim was found in the Auth0 ID token.</p>
      <p style="margin-top:8px">Ensure your Auth0 Post-Login Action sets this claim from
         <code>event.user.app_metadata.github_pat</code>.</p>
    `;
    return;
  }

  // Pass the token to index.astro via event detail — it will inject it into
  // Decap CMS's Redux store after the CMS script loads.
  window.dispatchEvent(new CustomEvent('auth0:ready', { detail: { token: githubPAT } }));
})();
