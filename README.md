# Static Site Template

A fully static, SEO-optimised site template built with:

- **[Astro](https://astro.build)** — static site generator, zero JS by default
- **[Decap CMS](https://decapcms.org)** — Git-based headless CMS served from `/admin/`
- **[Auth0](https://auth0.com)** — SPA login gate for the CMS admin panel
- **[Tailwind CSS](https://tailwindcss.com)** — utility-first styling
- **GitHub** — the only backend (content storage + versioning)

No server. No database. No runtime backend.

---

## Quick Start

```bash
# 1. Clone the template
git clone https://github.com/YOUR_USERNAME/YOUR_REPO static-site
cd static-site

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Visit `http://localhost:4321` to see the site.

---

## Project Structure

```
/
├── src/
│   ├── pages/              # Astro pages
│   │   ├── index.astro     # Home page
│   │   ├── 404.astro
│   │   └── blog/
│   │       ├── index.astro
│   │       └── [slug].astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── components/
│   │   ├── SEO.astro
│   │   ├── Header.astro
│   │   └── Footer.astro
│   ├── content/            # Managed by Decap CMS
│   │   ├── config.ts       # Collection schemas
│   │   ├── pages/
│   │   ├── posts/
│   │   ├── lists/
│   │   └── settings/
│   └── theme.json          # Theme variables (editable in CMS)
│
├── public/
│   └── admin/
│       ├── auth.js             # Auth0 guard + Decap loader
│       └── widgets/
│           └── csv-import.js   # Custom CSV bulk-import widget
│
├── src/pages/admin/
│   ├── index.astro             # Auth0 gate page (injects env vars at build time)
│   └── config.yml.ts           # Dynamic Decap config (injects env vars at build time)
│
├── .env.example            # All required environment variables (copy → .env)
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
└── package.json
```

---

## Configuration

All configuration lives in a single `.env` file — nothing needs to be hardcoded.

```bash
cp .env.example .env
```

Then edit `.env`:

```ini
# Site
PUBLIC_SITE_URL=https://your-domain.com

# GitHub backend (Decap CMS)
PUBLIC_GITHUB_REPO=your-username/your-repo
PUBLIC_GITHUB_BRANCH=main
PUBLIC_GITHUB_BASE_URL=https://api.netlify.com

# Auth0
PUBLIC_AUTH0_DOMAIN=dev-xxxx.us.auth0.com
PUBLIC_AUTH0_CLIENT_ID=your-client-id
```

Astro bakes these into the static output at **build time**:

- `src/pages/admin/index.astro` injects Auth0 credentials via `window.__AUTH0_CONFIG__`
- `src/pages/admin/config.yml.ts` generates the Decap CMS config with GitHub settings

### Auth0 Dashboard Settings

Create a **Single Page Application** in Auth0 and set:

| Setting               | Value                            |
| --------------------- | -------------------------------- |
| Allowed Callback URLs | `https://your-domain.com/admin/` |
| Allowed Logout URLs   | `https://your-domain.com/`       |
| Allowed Web Origins   | `https://your-domain.com`        |

### Theme

Edit `src/theme.json` (or via the CMS at **Theme** in the sidebar):

```json
{
  "primaryColor": "#2563eb",
  "secondaryColor": "#7c3aed",
  "fontFamily": "system-ui, sans-serif",
  "fontScale": 1,
  "borderRadius": "0.5rem",
  "layoutStyle": "centered"
}
```

These generate CSS custom properties (`--color-primary`, etc.) consumed by Tailwind.

---

## CMS Collections

| Collection | Type      | Folder                           |
| ---------- | --------- | -------------------------------- |
| Pages      | Markdown  | `src/content/pages/`             |
| Posts      | Markdown  | `src/content/posts/`             |
| Lists      | JSON      | `src/content/lists/`             |
| Theme      | JSON file | `src/theme.json`                 |
| Settings   | JSON file | `src/content/settings/main.json` |

---

## CSV Bulk Import Widget

The custom widget at `public/admin/widgets/csv-import.js` lets editors:

1. Upload a `.csv` file
2. Preview the first 5 rows
3. Map CSV columns → collection fields
4. Import all rows as separate entries in one commit

**Commit message format:** `Bulk import via CSV: N items`

To use it in `config.yml`, add a field with `widget: csv-import`:

```yaml
- label: CSV Import
  name: csv_import
  widget: csv-import
  collection: posts
  fields:
    - title
    - description
    - date
```

---

## Deployment

### Netlify

1. Connect your GitHub repo to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Add environment variables if needed

### Vercel

```bash
vercel --prod
```

### GitHub Pages / Cloudflare Pages

Set build command `npm run build`, output directory `dist`.

---

## Scripts

| Command           | Description                                |
| ----------------- | ------------------------------------------ |
| `npm run dev`     | Start local dev server at `localhost:4321` |
| `npm run build`   | Build static output to `dist/`             |
| `npm run preview` | Preview the production build locally       |

---

## Authentication Flow

```
User visits /admin/
  └─ Auth0 SDK checks session
       ├─ Not authenticated → redirect to Auth0 login
       └─ Authenticated → load Decap CMS
            └─ User edits content → commits to GitHub → triggers build
```
