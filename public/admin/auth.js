/**
 * auth.js — Auth0 SPA guard for the Decap CMS admin panel.
 *
 * Auth0 credentials are NOT stored here.
 * They are injected at build time by src/pages/admin/index.astro
 * via window.__AUTH0_CONFIG__ using Astro's `define:vars` directive.
 *
 * To configure:
 *   1. Copy .env.example → .env
 *   2. Fill in PUBLIC_AUTH0_DOMAIN and PUBLIC_AUTH0_CLIENT_ID
 *   3. Rebuild / redeploy
 */

(async function () {
  const config = window.__AUTH0_CONFIG__;

  // Guard: ensure config was injected by the Astro page
  if (!config || !config.domain || !config.clientId ||
      config.domain === 'YOUR_AUTH0_DOMAIN' || config.clientId === 'YOUR_AUTH0_CLIENT_ID') {
    document.getElementById('auth-loading').innerHTML = `
      <h2 style="color:#dc2626">Auth0 not configured</h2>
      <p>Set <code>PUBLIC_AUTH0_DOMAIN</code> and <code>PUBLIC_AUTH0_CLIENT_ID</code>
         in your <strong>.env</strong> file, then rebuild.</p>
      <p style="margin-top:8px">See <strong>.env.example</strong> for all required variables.</p>
    `;
    return;
  }

  // Initialise Auth0 client
  const auth0 = await window.auth0.createAuth0Client({
    domain:   config.domain,
    clientId: config.clientId,
    authorizationParams: {
      redirect_uri: config.redirectUri,
    },
    cacheLocation: 'localstorage',
  });

  // Handle redirect callback (after login)
  if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
    await auth0.handleRedirectCallback();
    window.history.replaceState({}, document.title, '/admin/');
  }

  const isAuthenticated = await auth0.isAuthenticated();

  if (!isAuthenticated) {
    await auth0.loginWithRedirect();
    return;
  }

  // Authenticated — load Decap CMS
  document.getElementById('auth-loading').remove();

  const decapScript = document.createElement('script');
  decapScript.src = 'https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js';
  document.head.appendChild(decapScript);

  // Load the custom CSV widget after Decap is ready
  decapScript.onload = function () {
    const csvScript = document.createElement('script');
    csvScript.src = '/admin/widgets/csv-import.js';
    document.head.appendChild(csvScript);
  };
})();
