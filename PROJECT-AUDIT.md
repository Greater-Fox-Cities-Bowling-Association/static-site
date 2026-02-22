# GFCBA Project Audit

**Date:** 2026-07-13 (updated)  
**Project:** Greater Fox Cities Bowling Association website  
**Stack:** Astro 4 (hybrid output) · React 18 · Tailwind CSS 3 · TypeScript · Auth0 · GitHub API

---

## Table of Contents

1. [System Inventory](#system-inventory)
2. [System Deep-Dives](#system-deep-dives)
   - [1. Static Site Rendering](#1-static-site-rendering)
   - [2. Theme System](#2-theme-system)
   - [3. Layout System](#3-layout-system)
   - [4. Navigation System](#4-navigation-system)
   - [5. Page Builder](#5-page-builder)
   - [6. Component System](#6-component-system)
   - [7. Content Collections](#7-content-collections)
   - [8. CSV Import](#8-csv-import)
   - [9. Authentication & GitHub Token Flow](#9-authentication--github-token-flow)
   - [10. GitHub API Layer](#10-github-api-layer-githubapits)
   - [11. Dev Tooling](#11-dev-tooling)
   - [12. Collection Definition System](#12-collection-definition-system)
3. [Issues & Inconsistencies](#issues--inconsistencies)
4. [Homogeneity Assessment](#homogeneity-assessment)
5. [Recommendations](#recommendations)

---

## System Inventory

| System                   | Status       | Files                                                                                     |
| ------------------------ | ------------ | ----------------------------------------------------------------------------------------- |
| Static site rendering    | ✅ Working   | `[slug].astro`, `index.astro`, `src/layouts/`, `src/components/astro/`                    |
| Theme system             | ✅ Working   | `src/content/themes/`, `themeLoader.ts`, `useTheme.ts`, `ThemeEditor.tsx`                 |
| Layout system            | ✅ Working   | `src/content/layouts/`, `LayoutEditor.tsx`, `PageLayout.astro`                            |
| Navigation system        | ✅ Working   | `src/content/navigation/`, `NavigationEditor.tsx`                                         |
| Page builder (CMS)       | ✅ Working   | `PageEditor.tsx`, `src/content/pages/`, section editors                                   |
| Component system         | ✅ Working   | `src/content/components/`, `PrimitiveComponentEditor.tsx`, `CompositeComponentEditor.tsx` |
| Content collections      | ✅ Working   | `centers`, `tournaments`, `honors`, `news`, `committees`                                  |
| Collection def system    | ✅ Working   | `src/content/collection-defs/`, `CollectionDefEditor.tsx`, `CollectionDefList.tsx`        |
| CSV import               | ✅ Working   | `CSVImporter.tsx`, `csvMappers.ts`, `DataPreview.tsx`                                     |
| Draft autosave           | ✅ Working   | `draftStore.ts` (localStorage)                                                            |
| Auth (Auth0)             | ✅ Working   | `Auth0Provider.tsx`, `Auth0Login.tsx`, `ImportAdmin.tsx`                                  |
| GitHub persistence       | ✅ Working   | `githubApi.ts` (~2 523 LOC)                                                               |
| Dev local persistence    | ✅ Working   | `/api/save-page.ts`, `/api/delete-page.ts`                                                |
| Branch detection         | ✅ Working   | `set-branch.js` → `.env.local`                                                            |
| Token derivation utility | ⚠️ Orphaned  | `tokenDerivation.ts` (unused in production flow)                                          |
| Netlify CMS remnant      | ⚠️ Dead code | `public/admin/config.yml`, `public/admin/index.html`                                      |

---

## System Deep-Dives

### 1. Static Site Rendering

Pages are generated from `src/content/pages/*.json`. The single dynamic route `[slug].astro` loads every published page, resolves its layout, sorts sections by `order`, and renders them through `SectionRenderer.astro`.

`BaseLayout.astro` is the only true HTML shell. It:

- Loads the active theme server-side via `loadActiveTheme()` (Node.js filesystem read).
- Injects all six color tokens, two font tokens, and any spacing tokens as `:root` CSS custom properties in an inline `<style>` tag.
- Loads all Google Font families unconditionally (every font in the picker is always requested — see issue #1).

`SectionRenderer.astro` is recursive. If a section has `children`, it recurses via `Astro.self`. Per-section `styleOverrides` are applied as a wrapper `<div>` with an inline style; a scoped `<style>` block removes the inner `<section>`'s own background when an override is set.

---

### 2. Theme System

**Data model:** JSON files in `src/content/themes/`. One file has `isActive: true` at a time. A Zod schema exists in `src/content/config.ts` and runs at build time, but the admin reads and writes theme files directly as JSON via `githubApi.ts` — the JSON file is the source of truth.

**Server path:** `themeLoader.ts` reads the filesystem directly with Node's `fs` module. Falls back to `default.json` if no active theme exists.

**Client path (React admin):** `useTheme.ts` hook tries three sources in order:

1. `sessionStorage` key `active-theme` (set by `ThemeEditor` after saving).
2. `import.meta.glob('/src/content/themes/*.json')` (eager, picks the first with `isActive: true`).
3. Computed CSS custom properties already on `:root`.

**Tailwind bridge:** `tailwind.config.mjs` maps all six color tokens to CSS variables (`var(--color-primary)` etc.) and the two font stacks. This is well-designed — Tailwind utility classes like `bg-primary`, `text-secondary`, `font-heading` all resolve to the active theme at runtime.

**Updating a theme in prod:** `ThemeEditor` calls `saveThemeFile()` in `githubApi.ts`, which commits the JSON to GitHub. Because it is a static-site build, the site must be re-built for the new theme to take effect on the public-facing site.

---

### 3. Layout System

**Data model:** `src/content/layouts/*.json`. Schema requires `id`, `name`, `description`, `header` (showNavigation, navigationStyle), and `footer`.

**Assignment:** A page sets `layoutId` to a layout's `id`, or omits it to auto-use `default`. Set `useLayout: false` to render with no shell.

**Gap:** The `Layout` TypeScript interface in `cms.ts` has a `navigationId` field (which navigation menu to use), but `LayoutEditor.tsx` does not appear to write this field. Additionally, `[slug].astro` reads layouts via `getEntry("layouts", id)`, which uses Astro's content system — any field absent from the Zod schema would be stripped from the result. Either way, the layout → navigation link is not functional.  
→ See issue #2.

---

### 4. Navigation System

**Data model:** `src/content/navigation/*.json`. Items have `id`, `label`, `href`, `order`, `children` (recursive). A recursive Zod schema exists for build-time use, but the admin reads and writes navigation files directly as JSON.

**Rendering:** `Navigation.astro` reads the navigation collection and renders it. There is no visible runtime link from a Layout's `navigationId` to the actual navigation file — see issue #2.

---

### 5. Page Builder

The `PageEditor.tsx` is the largest component at ~1 965 lines. It implements:

- A **palette** (left panel): blocks tab lists builtin section types; components tab lists primitive and composite components from the GitHub-backed `src/content/components/` directory.
- A **canvas** (center panel): drag-and-drop zone with ordered section cards.
- A **properties editor** (right panel): a context-aware editor per section type, powered by individual section editor components in `src/components/react/sections/`.
- **Style overrides** per section: color pickers backed by the active theme's palette, font pickers, spacing selectors, background image input.
- **Draft autosave:** calls `autoSaveDraft()` from `draftStore.ts` on every change; prompts user to restore on open.
- **Dual save path:** dev → `POST /api/save-page`; prod → `githubApi.savePageFile()`.

**Section types:**

| Type          | Editor                       | Renderer                   |
| ------------- | ---------------------------- | -------------------------- |
| `hero`        | `HeroEditor.tsx`             | `HeroSection.astro`        |
| `text`        | `TextEditor.tsx`             | `TextSection.astro`        |
| `cardGrid`    | `CardGridEditor.tsx`         | `CardGridSection.astro`    |
| `cta`         | `CtaEditor.tsx`              | `CtaSection.astro`         |
| `contentList` | `ContentListEditor.tsx`      | `ContentListSection.astro` |
| `component`   | `ComponentSectionEditor.tsx` | `CompositeSection.astro`   |

**Type drift on `component` sections** — see issue #3.

---

### 6. Component System

Two tiers:

- **Primitive components** (`src/content/components/primitives/`): leaf UI elements described by a field schema (`ComponentField[]`). Rendered by looking up the primitive at build time.
- **Composite components** (`src/content/components/composites/`): an ordered list of primitive (or nested composite) instances with a `dataSchema` and a column span contract (`minColumns`, `defaultColumns`).

Composite instances support `{{template}}` variable interpolation in `props`. A `kind` field (`primitive` | `composite`) on each `CompositeComponentInstance` allows nesting.

**Column span system:** Each composite declares `minColumns` and `defaultColumns` (1–12 grid units). When placed on a page, `ComponentSection.columns` records the actual span chosen by the editor.

---

### 7. Content Collections

All collections are stored as JSON files. There are now **three distinct tiers**:

**Tier 1 — Infrastructure collections** (`pages`, `layouts`, `themes`, `navigation`) are loaded at render time via Astro's `getCollection()` / `getEntry()` in `[slug].astro`. A Zod schema in `config.ts` validates these at build time and shapes the returned data. These are fully integrated into both the CMS admin and the public-site renderer.

**Tier 2 — Legacy data collections** (`centers`, `tournaments`, `honors`, `news`, `committees`) are read and written directly as JSON by the admin via `githubApi.ts`. Zod schemas exist for them in `config.ts` and run at build time when `ContentListSection.astro` calls `getCollection()`, but the **source of truth for these data shapes is the JSON template** defined in `CollectionItemEditor.tsx` — not the Zod schema. These five collections are hardcoded in `CollectionList.tsx` via a `COLLECTION_META` object.

**Tier 3 — Dynamic user-defined collections** are defined by the user as `CollectionDef` JSON files stored in `src/content/collection-defs/`. They are fully managed via admin (see Section 12) and persist to GitHub, but **only exist in the admin layer** — they are not registered as Astro content collections in `config.ts` and therefore cannot be queried via `getCollection()` at build time. A `contentList` section pointing to a dynamic collection will fail to render on the public site. See issue #14.

| Collection       | Tier | Key Fields                            | Notes                                                   |
| ---------------- | ---- | ------------------------------------- | ------------------------------------------------------- |
| `centers`        | 2    | name, address, phone, lanes           | Stable shape; JSON template matches files on disk       |
| `tournaments`    | 2    | name, date, location, status          | `status` enum: upcoming / completed / registration-open |
| `honors`         | 2    | category, title, data[], recipients[] | JSON template initializes both arrays; see issue #4     |
| `news`           | 2    | title, date, excerpt, content         | No slug — filename is the identifier                    |
| `committees`     | 2    | name, role, members[]                 | Single-entry pattern (one file = one committee)         |
| `pages`          | 1    | slug, sections[], status              | CMS-managed; see Page Builder above                     |
| `layouts`        | 1    | id, header, footer                    | See Layout System above                                 |
| `themes`         | 1    | id, colors, fonts, isActive           | See Theme System above                                  |
| `navigation`     | 1    | id, items[]                           | See Navigation System above                             |
| _(user-defined)_ | 3    | defined by `CollectionDef.fields`     | Admin-only; not renderable on public site yet           |

---

### 8. CSV Import

`CSVImporter.tsx` (drag-and-drop, PapaParse) → `csvMappers.ts` (schema-driven mapping) → `DataPreview.tsx` → `githubApi.commitToGitHub()`.

**`csvMappers.ts` was completely rewritten** to be generic and schema-driven. The old version used column-detection heuristics (`hasYearColumn`, `hasMultipleCategories`, `hasScore`, `hasAverage`) to identify which honors shape to produce — fragile and hardcoded to the five known collections. The new version provides two generic functions:

- `mapCSVToCollection(rows, def)` — maps each CSV row to a JSON object by walking `def.fields`, coercing each value to the declared `CollectionFieldType` (`string`, `number`, `boolean`, `date`, `select`). Handles `array` and `object` sub-fields via `arrayFields`.
- `detectCollectionFromFilename(filename, defs)` — matches the uploaded filename against all `CollectionDef` ids and names to auto-select the right schema; falls back to `null` if no match.

The resulting JSON is committed directly via `githubApi.commitToGitHub()` — no Zod validation runs in this path.

**Dependency:** The CSV importer now requires a `CollectionDef` with a populated `fields` array to produce correct output. For the five legacy data collections that have not yet been migrated to `CollectionDef` entries in `src/content/collection-defs/`, the auto-detect path (`detectCollectionFromFilename`) will return no match and the user must manually select the correct definition.

---

### 9. Authentication & GitHub Token Flow

1. User hits `/admin` → `Auth0Provider` wraps the app.
2. Auth0 login redirects back to `/admin`.
3. `getIdTokenClaims()` extracts a GitHub PAT from the custom claim `https://gfcba.com/github_token`.
4. Token stored in `localStorage` as `github_token`.
5. All `githubApi.ts` functions receive the token as a parameter and use it in `Authorization: token <PAT>` headers.

`tokenDerivation.ts` implements XOR encryption for a token-splitting strategy but is **never called** in the above flow. It appears to be a scrapped alternative — see issue #5.

---

### 10. GitHub API Layer (`githubApi.ts`)

At ~2 523 lines, this is the largest single file. It provides:

- `commitToGitHub()` — universal PUT to Contents API (create or update via SHA)
- `fetchPagesDirectory()` / `fetchPageContent()` / `savePageFile()` / `deletePageFile()`
- `fetchLayoutsDirectory()` / `fetchLayoutContent()` / `saveLayoutFile()`
- `fetchThemesDirectory()` / `fetchThemeContent()` / `saveThemeFile()`
- `fetchNavigationDirectory()` / `fetchNavigationContent()` / `saveNavigationFile()`
- Collection CRUD for all five legacy content collections
- **New (Collection Def system):** `fetchCollectionDefs()` / `fetchCollectionDef(id)` / `saveCollectionDef(def)` / `deleteCollectionDef(id)` — all read from / write to `src/content/collection-defs/`
- `fetchCompositeComponents()` / `fetchPrimitiveComponents()` / `saveCompositeComponent()` etc.
- Dev/prod dual-path: when `DEV && !forceGitHubAPI`, functions call the local `/api/*` endpoints instead of GitHub.
- Debug logging via `logAPICall()` / `logAPIResponse()` — gated on `import.meta.env.DEV`.

**Inconsistency:** The `generateFilename()` helper still has hardcoded `switch` cases for `'honors'`, `'centers'`, `'tournaments'`, and `'news'`. Dynamic collections created via `CollectionDefEditor` fall through to the `default` case and get a generic UUID filename. See issue #15.

---

### 11. Dev Tooling

**`set-branch.js`:** Runs before `astro dev/build`. Reads the current git branch and writes it as `PUBLIC_GIT_BRANCH` to `.env.local`. The CMS uses this to commit to the current branch in dev and `main` in prod.

**Local API endpoints:**

- `POST /api/save-page` — writes a JSON file at the given path inside the project root. Dev only (returns 403 in production).
- `POST /api/delete-page` — deletes a JSON file. Dev only.

Both endpoints have `export const prerender = false` so Astro emits them as SSR routes under the hybrid output mode.

---

### 12. Collection Definition System

The Collection Definition system allows admin users to define new data collection schemas without touching code. It is the "meta-layer" that describes _what fields a collection has_ rather than _what data a collection contains_.

**Data model — `CollectionDef`** (defined in `src/types/cms.ts`):

```typescript
interface CollectionDef {
  id: string; // Folder name under src/content/ (e.g. "sponsors")
  name: string; // Human-readable label in admin UI
  description?: string;
  icon?: string; // Emoji shown in list view
  displayField?: string; // Which field to show as the item title
  summaryField?: string; // Which field to show as the item subtitle
  fields: CollectionField[];
  createdAt?: string;
  updatedAt?: string;
}

interface CollectionField {
  name: string; // JSON key
  label: string; // Display label in admin UI
  type: CollectionFieldType; // 'string' | 'number' | 'boolean' | 'select' | 'date' | 'array' | 'object'
  required?: boolean;
  options?: string[]; // Enum values for 'select' fields
  description?: string;
  arrayFields?: CollectionField[]; // Nested schema for array-of-objects fields
}
```

**Storage:** Each `CollectionDef` is persisted as `src/content/collection-defs/{id}.json` via `saveCollectionDef()` in `githubApi.ts`. The directory is `COLLECTION_DEFS_PATH = 'src/content/collection-defs'`.

**Admin UI:** Follows the exact same `List → Editor` pattern as all other admin systems:

- `CollectionDefList.tsx` — lists all definitions, `{ token, onEdit, onCreate, useGitHubAPI }` props
- `CollectionDefEditor.tsx` — full field-builder for creating/editing a definition, `{ defId?, token, onSave, onCancel, useGitHubAPI }` props

Both are wired into `ImportAdmin.tsx` as modes `"collection-defs"` and `"collection-def-editor"`.

**CSV import integration:** `csvMappers.ts` was entirely rewritten to be driven by `CollectionDef.fields`. The old heuristic per-collection logic is gone; see Section 8.

**Limitation:** Collection definitions live only in the admin and `src/content/collection-defs/`. They are **not** registered as Astro content collections in `config.ts`. Until a definition is also registered there, `getCollection()` will not find its data at build time and `ContentListSection.astro` cannot render it on the public site. See issue #14.

---

## Issues & Inconsistencies

### Issue #1 — All Google Fonts loaded unconditionally

**File:** `src/layouts/BaseLayout.astro`  
`BaseLayout.astro` requests all 11 Google Font families in a single `<link>` tag regardless of which fonts the active theme actually uses. On a page using only Inter + Outfit, the browser still downloads Playfair Display, Merriweather, Raleway, etc.  
**Impact:** Unnecessary network requests / render-blocking on every page.  
**Fix:** Build the `<link>` URL from `activeTheme.fonts.heading` and `activeTheme.fonts.body` only.

---

### Issue #2 — `navigationId` not wired in Layout editor or renderer

**Files:** `src/types/cms.ts`, `src/components/react/LayoutEditor.tsx`, `src/pages/[slug].astro`  
The `Layout` TypeScript interface has `navigationId?: string` to specify which navigation menu a layout should use, but `LayoutEditor.tsx` has no field for it, so it is never written to the layout JSON. Additionally, `[slug].astro` reads layouts via `getEntry("layouts", id)` — the layouts Zod schema also lacks this field, meaning even if it were written to the file it would be stripped at runtime.  
The result is that every layout silently falls back to a hardcoded navigation.  
**Fix:** Add a `navigationId` selector to `LayoutEditor.tsx`, add `navigationId: z.string().optional()` to the layouts Zod schema, and update `[slug].astro` / `PageLayout.astro` to load and pass the correct navigation.

---

### Issue #3 — `ComponentSection` type mismatch between TypeScript interface and actual saved JSON

**Files:** `src/types/cms.ts` vs `src/content/config.ts` vs `PageEditor.tsx`

The TypeScript `ComponentSection` interface and the Zod schema for `componentSectionSchema` disagree on field names. More importantly, neither clearly matches what `PageEditor.tsx` actually writes to the page JSON file:

| Field            | TypeScript interface (`cms.ts`) | Zod schema (`config.ts`)         |
| ---------------- | ------------------------------- | -------------------------------- |
| `componentType`  | `'primitive' \| 'composite'`    | ❌ absent                        |
| `columns`        | `number`                        | ❌ absent (has `defaultColumns`) |
| `data`           | `Record<string, any>`           | ❌ absent (has `props`)          |
| `label`          | `string?`                       | ❌ absent                        |
| `props`          | absent                          | `z.record(z.any())`              |
| `defaultColumns` | absent                          | `z.number().optional()`          |

Since pages are read via `getEntry("pages", slug)` in `[slug].astro`, any field the Zod schema doesn't know about is stripped before the renderer sees it. This means `componentType`, `columns`, `data`, and `label` — written by the editor — are silently dropped at render time. This is the single most critical inconsistency in the project.  
**Fix:** Reconcile all three (TypeScript interface, Zod schema, editor output) into one agreed shape. The Zod schema must include every field the editor writes.

---

### Issue #4 — Honors JSON template initializes both shapes, producing noisy files

**Files:** `src/components/react/CollectionItemEditor.tsx`, `src/utils/csvMappers.ts`, `src/components/astro/sections/ContentListSection.astro`  
The `CollectionItemEditor` template for `honors` initializes every new file with **both** `data: []` and `recipients: []`. In practice a given honors entry is either tabular (Hall of Fame, Bowler of Year, High Average) or a recipients list (300 games) — never both. The CSV importer picks one via column-detection heuristics, but the editor template always writes the other as an empty array.  
This means every honors file on disk carries an unused empty array, and `ContentListSection.astro` must branch on both shapes at render time.  
**Fix:** Add an explicit `format: 'tabular' | 'recipients'` field to the honors template. Initialize only the matching array (`data` or `recipients`). Update `ContentListSection.astro` to drive branching off `format` instead of presence-checking both fields.

---

### Issue #5 — `tokenDerivation.ts` is dead code

**File:** `src/utils/tokenDerivation.ts`  
This module implements XOR encrypt/decrypt and a token-splitting strategy. Neither `encryptGitHubToken`, `deriveGitHubToken`, `splitToken`, nor `combineToken` are imported anywhere in the project. The actual token delivery path is Auth0 custom claims → `getIdTokenClaims()`.  
**Fix:** Delete the file, or document it as a standalone utility for the one-time task of preparing the encrypted token for the Auth0 rule.

---

### Issue #6 — Netlify CMS remnant in `public/admin/`

**Files:** `public/admin/config.yml`, `public/admin/index.html`  
These are the artifacts of a previous Netlify CMS integration. They are served statically at `/admin/config.yml` and would conflict with the Astro admin route if a browser tried to navigate there. The React-based admin at `src/pages/admin/index.astro` is the real admin.  
**Fix:** Delete `public/admin/`.

---

### Issue #7 — Admin panel bypasses the theme system

**File:** `src/pages/admin/index.astro`  
The admin page is a bare `<!DOCTYPE html>` document — it does **not** use `BaseLayout.astro` and therefore skips theme CSS variable injection. The admin React components use Tailwind classes like `bg-primary` which resolve at runtime via the CSS variable on `:root`. Without `BaseLayout` setting `:root`, those variables are `undefined` in production (where `set:html` is never run).  
In dev this works because Vite serves a merged CSS with the default fallback values.  
**Fix:** Extract theme variable injection into a shared Astro component or snippet and include it in both `BaseLayout.astro` and the admin page's `<head>`.

---

### Issue #8 — Duplicate `PageLayout.astro` files

**Files:** `src/layouts/PageLayout.astro`, `src/components/astro/PageLayout.astro`  
Two files with the same name exist in different directories. `[slug].astro` imports from `src/components/astro/PageLayout.astro`. It is unclear whether `src/layouts/PageLayout.astro` is used anywhere or is a legacy copy.  
**Fix:** Run a reference check and delete the unused copy.

---

### Issue #9 — Draft orphan on slug rename

**File:** `src/utils/draftStore.ts`  
Draft keys are `gfcba-draft-<slug>`. If a user renames a page's slug in the editor, the old draft persists in localStorage under the old key. There is no migration logic on slug change and no UI to view/clean orphaned drafts.  
**Fix:** When the editor detects a slug change (compare `editor.originalSlug` vs `page.slug`), migrate the draft key or delete the old one.

---

### Issue #10 — `githubApi.ts` is now ~2 523 lines with no module splitting

**File:** `src/utils/githubApi.ts`  
All GitHub API functions for every collection live in one file. Functions follow a consistent naming pattern (`fetch<Type>Directory`, `fetch<Type>Content`, `save<Type>File`) which is good, but the sheer size makes it hard to navigate and increases the surface area for merge conflicts.  
**Fix:** Split into domain modules (`github/pages.ts`, `github/themes.ts`, `github/collections.ts`, etc.) that all import a shared `commitToGitHub` base function.

---

### Issue #11 — TypeScript build error in `ComponentSectionEditor.tsx` (BLOCKS BUILD)

**File:** `src/components/react/sections/ComponentSectionEditor.tsx` line 696  
`child.primitive` is typed as `string | undefined` (because `CompositeComponentInstance.primitive` is only present when `kind === 'primitive'`), but it is passed to `renderPrimitivePreview()` which requires a plain `string`. TypeScript rejects this.  
**Impact:** `astro build` and `astro check` both fail. The site cannot be built from a clean CI environment.  
**Fix:** Add a guard before the call:

```typescript
if (!child.primitive) return null;
```

or narrow the type with a `kind === 'primitive'` check before the function call.

---

### Issue #12 — Two parallel collection management systems coexist

**Files:** `src/components/react/CollectionItemEditor.tsx`, `src/components/react/CollectionList.tsx`, `src/components/react/CollectionDefEditor.tsx`, `src/components/react/CollectionDefList.tsx`

Two systems exist side by side with no documented relationship:

- **Legacy system:** `CollectionList.tsx` renders a hardcoded `COLLECTION_META` object with the five fixed collection names (`centers`, `honors`, `tournaments`, `news`, `committees`). Clicking an entry opens `CollectionItemEditor.tsx`, which also uses hardcoded `TEMPLATES` to create new items.
- **New system:** `CollectionDefList.tsx` / `CollectionDefEditor.tsx` allows a user to define an arbitrary new collection schema stored in `src/content/collection-defs/`. Items created under a dynamic collection go through `CollectionItemEditor.tsx` as well — but without a hardcoded template, that path is untested.

There is no migration story: the five legacy collections are not represented as `CollectionDef` files, so the CSV importer's generic `detectCollectionFromFilename()` will never match them.  
**Fix:** Create `CollectionDef` entries for `centers`, `honors`, `tournaments`, `news`, and `committees` in `src/content/collection-defs/`. Update `CollectionList.tsx` to load the list dynamically from `fetchCollectionDefs()` rather than the hardcoded `COLLECTION_META`. Update `CollectionItemEditor.tsx` to build its "new item" template from the `CollectionDef.fields` instead of the static `TEMPLATES` object. This collapses both systems into one.

---

### Issue #13 — `CollectionField` and `ComponentField` are near-duplicate types

**File:** `src/types/cms.ts`

Two similar "field descriptor" interfaces exist:

| Property      | `CollectionField`              | `ComponentField`              |
| ------------- | ------------------------------ | ----------------------------- |
| `name`        | ✅                             | ✅                            |
| `label`       | ✅                             | ✅                            |
| `type`        | `CollectionFieldType` (7 vals) | `FieldType` (different union) |
| `options`     | `string[]` (enum choices)      | ❌ absent                     |
| `values`      | ❌ absent                      | `string[]` (enum choices)     |
| `required`    | ✅                             | ✅                            |
| `description` | ✅                             | ✅                            |
| `arrayFields` | ✅ (nested schema)             | ❌ absent                     |

Both describe "a field in a schema" but differ only in naming (`options` vs `values`) and the specific type union. This is a homogeneity gap in the type system.  
**Fix:** Either (a) unify into one `FieldDescriptor` interface and alias both names, or (b) add an explicit comment in `cms.ts` documenting why the two types differ and should remain separate.

---

### Issue #14 — Dynamic collections cannot render on the public site

**Files:** `src/components/astro/sections/ContentListSection.astro`, `src/content/config.ts`

`ContentListSection.astro` retrieves collection data via Astro's `getCollection(collection)`. This only works for collections registered in `src/content/config.ts` with a Zod schema. Collections defined via the new `CollectionDefEditor` exist only in `src/content/collection-defs/*.json` — they are **not** registered in `config.ts`.

The result: if a user creates a new collection (e.g. `sponsors`) via the admin and then adds a `contentList` section to a page pointing to `sponsors`, the public site will throw at build time (`collection "sponsors" does not exist`).  
**Fix:** This requires a code-generation step or a dynamic collection approach. Options:

- **Auto-generate:** Add a `prebuild` script that reads `src/content/collection-defs/*.json` and writes a stub Zod entry for each into `config.ts` (or a separate generated file that `config.ts` imports).
- **Bypass Zod:** Change `ContentListSection.astro` to use a raw filesystem read (like the admin does) instead of `getCollection()` for collections that are not statically registered.

---

### Issue #15 — `generateFilename()` has hardcoded collection cases

**File:** `src/utils/githubApi.ts`  
The `generateFilename()` helper uses a `switch` over collection names to format filenames for each of the five legacy collections. Dynamic collections created via `CollectionDefEditor` fall through to the `default` case and receive an opaque UUID filename.  
**Impact:** Low on its own, but inconsistent with the new dynamic model — the admin UI produces ugly unsearchable filenames for user-defined collections.  
**Fix:** Extend `generateFilename()` to accept an optional `CollectionDef` and derive the filename from the `displayField` value (e.g. `sponsors/acme-bowling-supply.json`) rather than a UUID.

---

## Homogeneity Assessment

| Dimension                 | Score      | Notes                                                                                                                                                           |
| ------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript coverage       | 🟢 Good    | Strong typing throughout; all public APIs have interfaces                                                                                                       |
| Schema / JSON parity      | 🟡 Partial | Data collections are JSON-first (admin writes directly); `pages` still validated by Zod via `getEntry()` and schema lags editor output for `component` sections |
| Naming conventions        | 🟢 Good    | Files, functions, and IDs follow consistent `kebab-case` / `camelCase` conventions                                                                              |
| Save pattern              | 🟢 Good    | Every editor follows the same save flow: validate → call `save<X>File()` → `onSave()` callback                                                                  |
| Editor component shape    | 🟢 Good    | All `*Editor` components share `{ id, token, onSave, onCancel, useGitHubAPI }` props; new `CollectionDefEditor` follows this exactly                            |
| List component shape      | 🟢 Good    | All `*List` components share `{ token, onEdit, onCreate, useGitHubAPI }` props; new `CollectionDefList` follows this exactly                                    |
| Section editor shape      | 🟢 Good    | All section editors use `SectionEditorContext` and `onChange(section)` pattern                                                                                  |
| CSS theming               | 🟢 Good    | All styling routed through CSS variables; Tailwind config bridges to theme tokens                                                                               |
| Dev vs prod divergence    | 🟡 Partial | Dual persistence path is managed but adds complexity; see issue #10                                                                                             |
| Schema / interface parity | 🔴 Gap     | `ComponentSection` type inconsistency (issue #3) is the critical gap; build currently broken by issue #11                                                       |
| Collection management     | 🔴 Split   | Two systems coexist: hardcoded `CollectionItemEditor` (5 fixed) + dynamic `CollectionDefEditor` (user-defined); no migration path (issue #12)                   |
| Field descriptor types    | 🟡 Partial | `CollectionField` (uses `options`) and `ComponentField` (uses `values`) are near-duplicate types (issue #13)                                                    |
| Collection render path    | 🔴 Gap     | Dynamic collections (Tier 3) cannot be rendered on the public site; not registered in Astro `config.ts` (issue #14)                                             |
| Dead code                 | 🟡 Partial | `tokenDerivation.ts` and `public/admin/` are unused (issues #5, #6)                                                                                             |

---

## Recommendations (Priority Order)

1. **[Critical]** Fix TypeScript build error in `ComponentSectionEditor.tsx` line 696 (issue #11). Add a `kind === 'primitive'` guard before `renderPrimitivePreview()`. The site cannot be built from CI until this is resolved.

2. **[Critical]** Fix `ComponentSection` type mismatch (issue #3). Agree on the field names (`props` vs `data`, `defaultColumns` vs `columns`), update `cms.ts`, `config.ts`, and the editor output, then verify all component-section JSON files on disk use the correct keys.

3. **[High]** Bridge dynamic collections to the public-site renderer (issue #14). Either auto-generate Zod stubs from `collection-defs/*.json` in a prebuild script, or change `ContentListSection.astro` to bypass `getCollection()` for unregistered collections. Without this, the new Collection Def system only works in the admin.

4. **[High]** Unify the two collection management systems (issue #12). Create `CollectionDef` entries for the five legacy collections, then drive `CollectionList.tsx` and `CollectionItemEditor.tsx` from `fetchCollectionDefs()` instead of hardcoded metadata. This makes Tier 2 and Tier 3 the same tier.

5. **[High]** Wire `navigationId` in the layout editor and Zod schema (issue #2) so the layout → navigation link is actually persisted and functional at render time.

6. **[High]** Fix admin page theme injection (issue #7) so the admin UI renders correctly in production.

7. **[Medium]** Unify or document `CollectionField` vs `ComponentField` (issue #13). At minimum add a comment in `cms.ts`; at best merge the two into a single `FieldDescriptor` type.

8. **[Medium]** Remove the Netlify CMS remnant from `public/admin/` (issue #6).

9. **[Medium]** Delete or document `tokenDerivation.ts` (issue #5).

10. **[Medium]** Fix unconditional Google Fonts loading (issue #1).

11. **[Medium]** Fix `generateFilename()` to derive filenames for dynamic collections from the `displayField` value (issue #15).

12. **[Medium]** Resolve `PageLayout.astro` duplication (issue #8).

13. **[Low]** Formalize honors format with an explicit `format` discriminator (issue #4). _Note: this may become moot if the honors collection is migrated to a `CollectionDef` entry per recommendation #4._

14. **[Low]** Add draft migration on slug rename (issue #9).

15. **[Low]** Split `githubApi.ts` into domain modules (issue #10).
