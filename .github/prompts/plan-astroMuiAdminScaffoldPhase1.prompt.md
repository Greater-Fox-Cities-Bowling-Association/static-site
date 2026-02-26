# Plan: Astro + MUI + Admin Scaffold (Phase 1)

The workspace is a blank Git repo. This plan scaffolds the full project skeleton: public Astro site, Auth0-protected admin as Astro React islands, MUI component system stubs, environment files, and a GitHub Actions workflow that runs `astro build` on push to `main` and deploys `dist/` to static.app.

**Full publish flow:**
Admin editor → commits JSON to GitHub → GitHub Actions triggers → `astro build` → dist deployed to static.app

---

## Steps

1. **`package.json`** — scripts: `dev: astro dev`, `build: astro build`, `preview: astro preview`. Dependencies: `astro`, `@astrojs/react`, `@astrojs/sitemap`, `react@18`, `react-dom@18`, `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`, `@auth0/auth0-react`.

2. **`astro.config.mjs`** — `output: 'static'`, integrations: `react()`, `sitemap()`. No Tailwind.

3. **`tsconfig.json`** — strict, `jsx: react-jsx`, path aliases `@cms` → `./cms`, `@src` → `./src`.

4. **`.gitignore`** — `node_modules/`, `dist/`, `.astro/`, `.env*.local`.

5. **`.env.development`**:
   - `PUBLIC_AUTH0_DOMAIN=` (placeholder)
   - `PUBLIC_AUTH0_CLIENT_ID=` (placeholder)
   - `PUBLIC_AUTH0_REDIRECT_URI=http://localhost:4321/admin/`
   - `PUBLIC_AUTH0_LOGOUT_URI=http://localhost:4321/`
   - `PUBLIC_GITHUB_REPO=Greater-Fox-Cities-Bowling-Association/static-site`
   - `PUBLIC_GITHUB_BRANCH=tina`
   - `PUBLIC_GITHUB_PAT=` (placeholder, dev only)

6. **`.env.production`** — same keys, `REDIRECT_URI`/`LOGOUT_URI` → `https://yourdomain.com/`, `GITHUB_BRANCH=main`, `GITHUB_PAT=` with comment: _retrieved from Auth0 claim `https://gfcba.com/github_token`_.

7. **`src/theme.json`** — MUI-compatible token stub: primary/secondary/neutral palette, typography scale (h1–h6, body1/2), spacing unit, border radius presets, box shadow levels.

8. **`src/layouts/BaseLayout.astro`** — wraps all public pages. Accepts `title`, `description` slots for SEO `<head>`. Applies MUI `CssBaseline` via a thin React island.

9. **`src/pages/index.astro`** — public homepage stub using `BaseLayout`, renders a placeholder `<Hero />` React/MUI component.

10. **`src/pages/admin/index.astro`** — single Astro page at `/admin/`. Renders `<AdminApp client:only="react" />` so the entire admin is a client-side React island (no SSR). Astro handles routing to `/admin/` statically.

11. **`src/components/admin/AdminApp.tsx`** — React root wrapped in `Auth0Provider` (reads `PUBLIC_AUTH0_*` env vars). Renders:
    - Unauthenticated: MUI login button → `loginWithRedirect()`
    - Loading: MUI `CircularProgress`
    - Authenticated: stub dashboard shell (`AppBar` + `Drawer` + content area) with placeholder sections for Editor, Components, Theme, CSV Importer

12. **`src/components/admin/useGitHubToken.ts`** — hook that extracts the GitHub token: from `PUBLIC_GITHUB_PAT` env var in dev, or from the Auth0 ID token claim `https://gfcba.com/github_token` in production.

13. **`cms/components/metadata/`** — 11 stub JSON files following the spec schema: `box.json`, `stack.json`, `grid.json`, `typography.json`, `button.json`, `divider.json`, `paper.json`, `image.json`, `icon.json`, `spacer.json`, `card.json`.

14. **`cms/components/registry.js`** — imports all metadata JSONs, exports `componentRegistry` as a `Map<id, metadata>`.

15. **`cms/github/github.js`** — exports `commitFiles(token, repo, branch, files[])` using the GitHub REST API (`PUT /repos/{owner}/{repo}/contents/{path}`), iterating over a files array to stage each file in a single logical publish operation.

16. **`cms/editor/README.md`**, **`cms/builder/README.md`**, **`cms/theme/README.md`** — Phase 2 placeholder stubs.

17. **`src/content/.gitkeep`** — ensures directory is tracked.

18. **`.github/workflows/deploy.yml`** — triggers on `push` to `main`. Steps: `actions/checkout@v3`, then `designmodo/static-app-deploy-action@v1.0.0` with:
    - `api-key: ${{ secrets.STATIC_APP_API_KEY }}`
    - `build-dir: dist`
    - `build-command: npm run build`
    - `install-command: npm ci`
    - `node-version: 20`
    - `pid: ${{ secrets.STATIC_APP_PID }}` (optional, for updating an existing site vs. creating a new one)

---

## Verification

- `npm install` resolves cleanly.
- `astro dev` — public homepage loads at `localhost:4321`; `/admin/` shows MUI login button.
- `astro build` — produces `dist/` with `dist/admin/index.html`.
- Push to `main` → GitHub Actions workflow runs and deploys to static.app (once `STATIC_APP_API_KEY` secret is set in the repo).

---

## Decisions

- Env vars prefixed `PUBLIC_` so Astro exposes them to client-side code.
- Admin is `client:only="react"` — zero server-side rendering for the admin; only the public pages are statically rendered.
- `STATIC_APP_PID` is a second optional GitHub secret; without it, each deploy creates a new static.app site. With it, it updates the existing one.
- No Tailwind — all styling via MUI `sx`, `styled()`, and `theme.json` tokens.
- No Auth0 `audience` per your preference.
