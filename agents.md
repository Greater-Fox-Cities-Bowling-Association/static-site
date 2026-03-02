# agents.md — Headless CMS Specification (Astro + Custom Admin + MUI + GitHub + Auth0)

## 📌 Project Overview

This project is a **git-based headless CMS**. Content is stored as JSON files in a GitHub repository. A custom React admin UI — protected by Auth0 — lets editors create, edit, delete, and bulk-import content pages. Astro consumes those JSON files at build time to produce a fully static, SEO-optimized site. There is no database and no backend server.

The system must:

- Run entirely client-side
- Be protected behind Auth0 authentication
- Read and commit content directly to GitHub using browser-based GitHub APIs
- Support creating, editing, and deleting content pages
- Support CSV bulk import for creating multiple pages at once
- Produce a fully static, SEO-optimized Astro site

This template is designed to be cloned and reused to spin up new sites quickly with minimal configuration.

---

## 🎯 Primary Goals

- Provide a fully static, SEO-optimized site with no backend.
- Build a custom headless CMS admin UI with:
  - Content page list (create, edit, delete)
  - Per-page form editor (title, slug, description, body)
  - CSV bulk importer
  - GitHub commit integration
- Use GitHub as the single source of truth for all content.
- Use Auth0 to protect the admin interface.
- Make the system extensible, modular, and future-proof.

---

## 🏗️ Architecture Summary

### Public Site (Astro)

- Framework: Astro
- Rendering: Static Site Generation (SSG)
- Styling: MUI components in the admin; plain Astro layouts on the public site
- SEO: Astro `<head>` management + sitemap + schema.org
- Content: JSON files stored in `src/content/pages/` in GitHub
- Pages rendered from JSON at build time via `[slug].astro`

### Admin Interface (Custom Build)

- Framework: React (client-side only, `client:only="react"`)
- Served from `/admin/` as static files
- Protected by Auth0 SPA login
- Features:
  - Content page list — browse all pages, create, delete
  - Form editor — edit title, slug, description, body (HTML) per page
  - CSV importer — upload spreadsheet, map columns, bulk-create pages
  - GitHub commit interface — all saves go directly to the GitHub repo
  - Raw JSON fallback editor — for non-ContentPage files

### Auth

- Auth0 SPA login
- Protects `/admin/`
- After login, the CMS retrieves a GitHub PAT from a custom Auth0 claim:
  https://gfcba.com/github_token

### GitHub Backend

- All content stored in:
  Greater-Fox-Cities-Bowling-Association/static-site
- Branch strategy:
  - Development: `custom`
  - Production: `main`
- Browser-based commits using GitHub REST API (Git Trees API for atomic multi-file commits)

### Hosting

- Any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, static.app)

---

## 📁 File Structure

/
├─ src/
│ ├─ pages/
│ │ ├─ index.astro
│ │ ├─ [slug].astro # Renders any content page from JSON
│ │ └─ admin/
│ │ └─ index.astro # Mounts the React admin app
│ ├─ components/
│ │ └─ admin/ # All admin React components
│ │ ├─ AdminApp.tsx
│ │ ├─ useGitHubToken.ts
│ │ ├─ pages/
│ │ │ └─ ContentList.tsx
│ │ ├─ editor/
│ │ │ └─ ContentFileEditor.tsx
│ │ └─ csv/
│ │ └─ CsvImporter.tsx
│ ├─ layouts/
│ │ └─ BaseLayout.astro
│ └─ content/
│ └─ pages/ # One JSON file per page
│ └─ home.json
│
├─ cms/
│ ├─ types.ts # Shared TypeScript types (ContentPage, etc.)
│ └─ github/
│ ├─ github.js # commitFiles() — atomic multi-file commits
│ └─ githubContent.ts # listDirectory(), fetchFileContent()
│
├─ .env.development
├─ .env.production
├─ package.json
├─ astro.config.mjs
└─ agents.md

---

## 🔐 Environment Variables

### `.env.development`

```
PUBLIC_AUTH0_DOMAIN=
PUBLIC_AUTH0_CLIENT_ID=
PUBLIC_AUTH0_REDIRECT_URI=http://localhost:4321/admin/
PUBLIC_AUTH0_LOGOUT_URI=http://localhost:4321/

PUBLIC_GITHUB_REPO=Greater-Fox-Cities-Bowling-Association/static-site
PUBLIC_GITHUB_BRANCH=custom

# Local PAT for development only
PUBLIC_GITHUB_PAT=
```

### `.env.production`

```
PUBLIC_AUTH0_DOMAIN=
PUBLIC_AUTH0_CLIENT_ID=
PUBLIC_AUTH0_REDIRECT_URI=https://yourdomain.com/admin/
PUBLIC_AUTH0_LOGOUT_URI=https://yourdomain.com/

PUBLIC_GITHUB_REPO=Greater-Fox-Cities-Bowling-Association/static-site
PUBLIC_GITHUB_BRANCH=main

# DO NOT hardcode a PAT here.
# The GitHub token is retrieved at runtime from the Auth0 ID token claim:
# https://gfcba.com/github_token
PUBLIC_GITHUB_PAT=
```

---

## 🧠 GitHub Token Flow

### Development

- Developer sets `PUBLIC_GITHUB_PAT` manually in `.env.development`
- Commits go to the `custom` branch

### Production

- Auth0 injects the claim `https://gfcba.com/github_token` into the ID token
- `useGitHubToken.ts` extracts the token after login
- Commits go to the `main` branch
- No PAT stored in environment variables

---

## 📝 Content Schema

Content pages are stored as JSON files in `src/content/pages/`. Each file follows the `ContentPage` type:

```ts
interface ContentPage {
  slug: string; // URL path segment, e.g. "about-us"
  title: string; // Page title (browser tab + heading)
  description?: string; // Meta description for SEO (≤160 chars)
  body?: string; // HTML body content
  [key: string]: unknown; // Any additional custom fields
}
```

---

## 📦 CSV Importer Requirements

- Upload CSV
- Preview table
- Map columns → content fields
- Generate multiple content files
- Commit via GitHub API
- Single commit containing all files

---

## 🚀 Deployment Requirements

- Build command: `astro build`
- Output: static HTML + assets
- CMS served from `/admin/`
- Ensure Auth0 callback URLs match production domain
- Ensure production commits target `main`

---

## 📘 Agent Responsibilities

### 1. Scaffolding Agent

- Create project folder
- Install Astro + dependencies
- Install MUI + React
- Create admin scaffold
- Create `.env.development` and `.env.production`
- Insert repo + branch values
- Insert Auth0 credentials
- Initialize GitHub repo

### 2. Development Agent

- Build content page list (browse, create, delete)
- Build per-page form editor (title, slug, description, body HTML)
- Build raw JSON fallback editor
- Build CSV importer
- Build GitHub integration layer (`commitFiles`, `listDirectory`, `fetchFileContent`)
- Build Auth0 login wrapper and token hook
- Implement `[slug].astro` static page renderer
- Add SEO metadata to `BaseLayout.astro`
- Enable sitemap once production domain is set

### 3. Testing Agent

- Validate content list loads pages from GitHub
- Validate create/edit/delete page flows
- Validate CSV import flow (upload → map → preview → publish)
- Validate Auth0 login and logout
- Validate GitHub commits:
  - Dev → `custom` branch
  - Prod → `main` branch
- Validate static build output (`astro build`)
- Validate SEO metadata on rendered pages

### 4. Deployment Agent

- Configure hosting provider (static.app via GitHub Actions)
- Set environment variables and GitHub secrets
- Verify admin loads and Auth0 redirects correctly
- Verify production commits use the Auth0-injected GitHub token

---

## 📄 Output Expectations

A generated site must include:

- `.env.development` with:
  - Repo: `Greater-Fox-Cities-Bowling-Association/static-site`
  - Branch: `custom`
  - Local PAT placeholder

- `.env.production` with:
  - Repo: `Greater-Fox-Cities-Bowling-Association/static-site`
  - Branch: `main`
  - No PAT (token retrieved from Auth0 claim)

- Auth0 claim extraction logic (`useGitHubToken.ts`)
- Custom CMS admin UI (`AdminApp.tsx`)
- Content page list with create/edit/delete (`ContentList.tsx`)
- Per-page form editor with raw JSON fallback (`ContentFileEditor.tsx`)
- CSV importer (`CsvImporter.tsx`)
- GitHub integration layer (`github.js`, `githubContent.ts`)
- Shared content types (`cms/types.ts`)
- Fully static Astro site with SEO metadata
- GitHub Actions workflow deploying `dist/` to static.app on push to `main`
