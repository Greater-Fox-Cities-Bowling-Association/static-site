/**
 * auth.js — Auth0 SPA guard for the Decap CMS admin panel.
 *
 * Configuration:
 *   Set AUTH0_DOMAIN and AUTH0_CLIENT_ID as environment variables at build time,
 *   or replace the placeholder strings below.
 *
 *   For Netlify: add these to Site > Environment variables.
 *   For Vercel:  add these to Project > Settings > Environment Variables.
 *
 * Auth0 Application settings (Auth0 Dashboard):
 *   - Application Type: Single Page Application
 *   - Allowed Callback URLs: https://your-domain.com/admin/
 *   - Allowed Logout URLs:   https://your-domain.com/
 *   - Allowed Web Origins:   https://your-domain.com
 */

(async function () {
  const AUTH0_DOMAIN    = 'YOUR_AUTH0_DOMAIN';    // e.g. dev-xxxx.us.auth0.com
  const AUTH0_CLIENT_ID = 'YOUR_AUTH0_CLIENT_ID'; // SPA client ID

  // Validate placeholders
  if (AUTH0_DOMAIN === 'YOUR_AUTH0_DOMAIN' || AUTH0_CLIENT_ID === 'YOUR_AUTH0_CLIENT_ID') {
    document.getElementById('auth-loading').innerHTML = `
      <h2 style="color:#dc2626">Auth0 not configured</h2>
      <p>Update <code>AUTH0_DOMAIN</code> and <code>AUTH0_CLIENT_ID</code> in <strong>/public/admin/auth.js</strong>.</p>
    `;
    return;
  }

  // Initialise Auth0 client
  const auth0 = await window.auth0.createAuth0Client({
    domain:   AUTH0_DOMAIN,
    clientId: AUTH0_CLIENT_ID,
    authorizationParams: {
      redirect_uri: window.location.origin + '/admin/',
    },
    cacheLocation: 'localstorage',
  });

  // Handle redirect callback (after login)
  if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
    await auth0.handleRedirectCallback();
    // Clean up URL
    window.history.replaceState({}, document.title, '/admin/');
  }

  const isAuthenticated = await auth0.isAuthenticated();

  if (!isAuthenticated) {
    // Not logged in — redirect to Auth0
    await auth0.loginWithRedirect();
    return;
  }

  // Authenticated — load Decap CMS
  document.getElementById('auth-loading').remove();

  // Inject Decap CMS scripts
  const decapScript = document.createElement('script');
  decapScript.src = 'https://unpkg.com/decap-cms@^3.0.0/dist/decap-cms.js';
  document.head.appendChild(decapScript);

  // Inject the custom CSV widget after Decap loads
  decapScript.onload = function () {
    const csvScript = document.createElement('script');
    csvScript.src = '/admin/widgets/csv-import.js';
    document.head.appendChild(csvScript);
  };
})();
