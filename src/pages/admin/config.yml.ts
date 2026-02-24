import type { APIRoute } from 'astro';

export const GET: APIRoute = () => {
  const repo      = import.meta.env.PUBLIC_GITHUB_REPO     ?? 'YOUR_USERNAME/YOUR_REPO';
  const branch    = import.meta.env.PUBLIC_GITHUB_BRANCH   ?? 'main';
  const auth0Domain = import.meta.env.PUBLIC_AUTH0_DOMAIN  ?? 'YOUR_TENANT.auth0.com';
  const siteUrl   = import.meta.env.PUBLIC_SITE_URL        ?? 'https://your-domain.com';

  const yaml = `
backend:
  name: github
  repo: ${repo}
  branch: ${branch}
  base_url: https://${auth0Domain}
  auth_endpoint: authorize

# local_backend: true   # Uncomment for local dev (no GitHub required)

media_folder: public/uploads
public_folder: /uploads

site_url: ${siteUrl}
display_url: ${siteUrl}

// ...existing code...
`.trimStart();

  return new Response(yaml, {
    headers: { 'Content-Type': 'text/yaml; charset=utf-8' },
  });
};