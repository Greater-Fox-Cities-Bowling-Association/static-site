# Agent Context — Generic CMS / GFCBA Site

> This file exists so AI coding agents have immediate project context without needing repeated explanation.

---

## Architecture Overview — Read This First

This repository contains **two distinct layers** that must never be confused:

### 1. Generic CMS Platform (the engine)

A fully content-agnostic static-site generator and headless CMS built on Astro. It is **not coupled to bowling, sports, or any specific domain**. It provides:

- A dynamic content-collection system (user-defined schemas stored as JSON)
- A React admin UI for managing any type of content
- A theme/layout engine
- A component system (primitives + composites)
- GitHub as the persistence layer (commits JSON directly to the repo)
- Astro renders whatever content/pages are defined — it knows nothing about bowling

### 2. GFCBA Site (the tenant)

The **Greater Fox Cities Bowling Association** website is the current _instance_ of the generic CMS. The bowling-specific content (centers, tournaments, news, honors, committees) lives entirely in JSON files under `src/content/`. Swapping that content out for a different domain would produce a completely different site — the platform code would be unchanged.

**When making any change:** ask whether it belongs to the platform (generic, reusable) or to the tenant (bowling-specific data/copy). Platform code should never hard-code bowling concepts.

---

## Project — Current Tenant

**Greater Fox Cities Bowling Association** public website.

- **URL:** https://www.greaterfoxcitiesba.com
- **Repo root:** `c:\Users\Michael\source\repos\static-site`

---

## Tech Stack

| Layer              | Technology                                                 |
| ------------------ | ---------------------------------------------------------- |
| Framework          | Astro 4 (`output: 'hybrid'`)                               |
| UI / Interactivity | React 18 + TypeScript                                      |
| Styling            | Tailwind CSS 3                                             |
| Content            | JSON files + Astro Content Collections (Zod schemas)       |
| Auth (admin)       | Auth0 (`@auth0/auth0-react`)                               |
| Persistence        | GitHub API (commits JSON files directly to repo)           |
| Deployment         | Push to `main` → GitHub Actions build → Static.app hosting |

---

## Repository Layout

```
src/
  content/           # ALL site data lives here as JSON
    config.ts        # Zod schemas; only "known" collections are registered here
    collection-defs/ # User-defined dynamic collection schemas (centers, news, etc.)
    pages/           # Page content JSON
    centers/         # Bowling-center data JSON
    tournaments/     # Tournament JSON
    news/            # News article JSON
    committees/      # Committee JSON
    honors/          # Honors & awards JSON
    themes/          # Active theme JSON
    layouts/         # Layout config JSON
    navigation/      # Navigation menu JSON
    components/
      primitives/    # Primitive component definitions
      composites/    # Composite component definitions

  components/
    astro/           # Static Astro components (server-rendered)
    react/           # Interactive React components (admin UI + client islands)

  pages/
    index.astro
    [slug].astro     # Dynamic page routing (single-segment)
    [...slug].astro  # Dynamic page routing (multi-segment)
    admin/           # Admin SPA entry point
    api/             # Astro API endpoints

  types/
    cms.ts           # All shared TypeScript types for the CMS system

  utils/
    githubApi.ts     # GitHub REST API helpers (read/write JSON files in repo)
    draftStore.ts    # localStorage draft management
    themeLoader.ts   # Active-theme loading
    useTheme.ts      # React hook for theme CSS variables
    csvMappers.ts    # CSV → JSON import helpers

  styles/
    global.css
```

---

## Content Architecture

### Static (Astro-registered) collections

Defined in `src/content/config.ts` with full Zod schemas:

- `collection-defs` — describes dynamic user collections
- `themes`
- `layouts`
- `navigation`
- `pages`
- `components` (primitives & composites)

### Dynamic (user-defined) collections

- Schema stored in `src/content/collection-defs/{id}.json`
- Data items stored in `src/content/{id}/*.json`
- Loaded at render time with `import.meta.glob` — **not** via `getCollection()`
- CRUD is performed by the admin UI writing to the GitHub API

---

## Admin CMS

The admin is a **generic, domain-agnostic** CMS. It has no knowledge of bowling, sports, or any tenant-specific concept. All content types are described at runtime through collection-def JSON files — the admin discovers and renders editors for whatever collections are defined.

- React SPA mounted at `/admin`
- Authentication via Auth0
- All writes go through `src/utils/githubApi.ts`, which commits JSON directly to the repo via the GitHub Contents API
- No database — the repo _is_ the database
- Drafts are stored in `localStorage` via `draftStore.ts` before committing
- `set-branch.js` injects the current git branch into the env at dev-server start

---

## Key Patterns

### Adding a new dynamic collection

1. Add `src/content/collection-defs/{id}.json` describing the schema (`CollectionDef` type)
2. Add data files to `src/content/{id}/`
3. No code changes needed — the admin UI and page renderer discover it automatically

### Adding a new page section type

1. Create a renderer component in `src/components/astro/sections/`
2. Register the new `SectionType` variant in `src/types/cms.ts`
3. Add a case in `src/components/astro/SectionRenderer.astro`

### GitHub API writes

All reads/writes use helpers from `src/utils/githubApi.ts`.  
The token comes from Auth0 (GitHub OAuth scope) and is passed explicitly — never stored in env at runtime.

---

## Dev Commands

```bash
npm run dev       # node set-branch.js && astro dev
npm run build     # astro check && astro build
npm run preview   # astro preview
npx astro check   # TypeScript / template type-check
```

---

## Known Conventions

- TypeScript strict mode is on (`tsconfig.json`)
- Tailwind utility classes only — no custom CSS except `global.css`
- JSON filenames use `kebab-case`
- Collection item `id` fields match the JSON filename (without extension)
- `updatedAt` / `createdAt` are ISO-8601 strings maintained by the admin UI
- The `DEBUG` flag in `githubApi.ts` is controlled by `import.meta.env.DEV`
- Astro `output: 'hybrid'` — most pages are SSG; API routes are SSR

---

## Environment Variables

See `SECRETS.md` (gitignored) for actual values. Expected variables:

| Variable                 | Purpose                                              |
| ------------------------ | ---------------------------------------------------- |
| `PUBLIC_AUTH0_DOMAIN`    | Auth0 tenant domain                                  |
| `PUBLIC_AUTH0_CLIENT_ID` | Auth0 SPA client ID                                  |
| `PUBLIC_GITHUB_OWNER`    | GitHub repo owner                                    |
| `PUBLIC_GITHUB_REPO`     | GitHub repo name                                     |
| `PUBLIC_SITE_BRANCH`     | Branch to commit content to (set by `set-branch.js`) |
