# agents.md — Static Website Builder Platform Specification (Astro + Custom Admin + MUI + GitHub + Auth0)

## 📌 Project Overview

This project defines a fully custom, fully static **website builder platform**, not just a CMS. It includes a drag‑and‑drop visual editor, a component builder, a theme engine, and a JSON‑based layout system. The platform uses **MUI** as the primitive component library and **Astro** to generate static pages. All content, layouts, components, and themes are stored as JSON in a GitHub repository. The admin interface is protected by Auth0 and runs entirely client‑side.

The system must:

- Run entirely client-side
- Be protected behind Auth0 authentication
- Commit content directly to GitHub using browser-based GitHub APIs
- Support drag‑and‑drop visual editing
- Support component composition (components built from other components)
- Support a theme engine
- Support event handlers
- Support CSV import for bulk content creation
- Produce a fully static, SEO‑optimized Astro site

This template is designed to be cloned and reused to spin up new sites quickly with minimal configuration.

---

## 🎯 Primary Goals

- Provide a fully static, SEO‑optimized site with no backend.
- Build a custom website builder admin UI with:
  - Drag‑and‑drop visual editor
  - Component builder
  - Theme editor
  - CSV importer
  - GitHub commit integration
- Use GitHub as the single source of truth for all content and configuration.
- Use Auth0 to protect the admin interface.
- Make the system extensible, modular, and future-proof.

---

## 🏗️ Architecture Summary

### Public Site (Astro)

- Framework: Astro
- Rendering: Static Site Generation (SSG)
- Styling: We are using MUI components which will have built in styling along with the theme editor
- SEO: Astro `<head>` management + sitemap + schema.org
- Content: JSON/Markdown/YAML files stored in GitHub
- Rendering: React components using MUI primitives

### Admin Interface (Custom Build)

- Framework: React
- Bundled into `/admin/` as static files
- Protected by Auth0 SPA login
- Features:
  - Drag‑and‑drop visual editor
  - Component builder (components built from other components)
  - Theme editor (JSON-based)
  - CSV importer
  - GitHub commit interface
  - File explorer for content
  - Live preview using MUI primitives

### Component System

- MUI is the primitive component library
- Components are defined by metadata JSON files
- Components can contain other components
- Components support event handlers
- Components support theme tokens
- Components serialize to JSON
- Components deserialize into React/MUI components for preview and Astro rendering

### Auth

- Auth0 SPA login
- Protects `/admin/`
- After login, the CMS retrieves a GitHub PAT from a custom Auth0 claim:
  https://gfcba.com/github_token

### GitHub Backend

- All content stored in:
  Greater-Fox-Cities-Bowling-Association/static-site
- Branch strategy:
  - Development: `tina`
  - Production: `main`
- Browser-based commits using GitHub REST/GraphQL APIs

### Hosting

- Any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages)

---

## 📁 File Structure

/
├─ src/
│ ├─ pages/
│ ├─ components/ # Astro/React components for final rendering
│ ├─ layouts/
│ ├─ theme.json # Theme tokens
│ └─ content/ # JSON/Markdown content
│
├─ cms/
│ ├─ components/
│ │ ├─ metadata/ # Component metadata JSON files
│ │ └─ registry.js # Component registry loader
│ ├─ editor/ # Visual editor code
│ ├─ builder/ # Component builder
│ ├─ theme/ # Theme editor
│ └─ github/ # GitHub integration layer
│
├─ public/
│ └─ admin/
│ ├─ index.html
│ ├─ app.js
│ ├─ auth.js
│ ├─ github.js
│ ├─ visual-editor/
│ ├─ components/
│ ├─ themes/
│ └─ csv-importer/
│
├─ .env.development
├─ .env.production
├─ package.json
├─ astro.config.mjs
└─ agents.md

---

## 🔐 Environment Variables

### `.env.development`

AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_REDIRECT_URI=http://localhost:4321/admin/
AUTH0_LOGOUT_URI=http://localhost:4321/

GITHUB_REPO=Greater-Fox-Cities-Bowling-Association/static-site
GITHUB_BRANCH=custom

# Local PAT for development only

GITHUB_PAT=

---

### `.env.production`

AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_REDIRECT_URI=https://yourdomain.com/admin/
AUTH0_LOGOUT_URI=https://yourdomain.com/

GITHUB_REPO=Greater-Fox-Cities-Bowling-Association/static-site
GITHUB_BRANCH=main

# DO NOT hardcode

# Retrieved from Auth0 claim:

# https://gfcba.com/github_token

GITHUB_PAT=

---

## 🧠 GitHub Token Flow

### Development

- Developer sets `GITHUB_PAT` manually
- Commits go to the `tina` branch

### Production

- Auth0 injects the claim:
  https://gfcba.com/github_token
- CMS extracts token after login
- Commits go to the `main` branch
- No PAT stored in environment variables

---

## 🧩 Component System (MUI-Based)

### Primitive Components (MUI)

- Box
- Stack
- Grid
- Typography
- Button
- Divider
- Paper
- Image
- Icon
- Spacer

### Composite Components

- Card
- Hero
- Feature list
- Pricing table
- Navbar
- Footer

### User-Defined Components

Users can:

- Drag primitives into a layout
- Configure props
- Add event handlers
- Save as a new component
- Reuse anywhere
- Commit to GitHub as JSON metadata

### Component Metadata Schema

Each component has a metadata file describing:

- Name
- Props
- Slots
- Allowed children
- Event handlers
- Theme usage
- Editor behavior
- Serialization rules

Example:

{
"id": "card",
"name": "Card",
"category": "composite",
"props": {
"padding": { "type": "spacing", "default": 2 },
"radius": { "type": "radius", "default": 2 },
"shadow": { "type": "shadow", "default": 1 }
},
"slots": {
"header": { "allowedTypes": ["Typography", "Icon"], "max": 1 },
"body": { "allowedTypes": ["Typography", "Image", "Button"], "max": 10 },
"actions": { "allowedTypes": ["Button"], "max": 5 }
},
"events": {
"onClick": { "type": "action", "default": null }
},
"theme": {
"usesColors": true,
"usesTypography": true,
"usesSpacing": true,
"usesRadius": true,
"usesShadow": true
},
"editor": {
"icon": "card",
"previewHeight": 240,
"draggable": true,
"resizable": true
}
}

---

## 🎨 Theme System Requirements

- Theme stored in `src/theme.json`
- Theme maps to MUI theme tokens
- Supports:
  - Colors
  - Typography
  - Spacing
  - Radius
  - Shadows
  - Layout tokens
- Visual editor updates live when theme.json changes

---

## 🧰 Visual Editor Requirements

- Drag‑and‑drop canvas
- Component palette
- Prop editor panel
- Event handler editor
- Theme editor
- Live preview using MUI primitives
- JSON serialization
- JSON deserialization
- GitHub commit integration

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
- Create custom CMS admin scaffold
- Create `.env.development` and `.env.production`
- Insert repo + branch values
- Insert Auth0 credentials
- Initialize GitHub repo

### 2. Development Agent

- Build drag‑and‑drop visual editor
- Build component builder
- Build theme editor
- Build CSV importer
- Build GitHub integration layer
- Build Auth0 login wrapper
- Implement MUI-based primitives
- Implement composite components
- Implement metadata system
- Ensure Astro reads theme.json
- Add SEO components

### 3. Testing Agent

- Validate visual editor
- Validate component builder
- Validate theme editor
- Validate CSV import flow
- Validate Auth0 login
- Validate GitHub commits:
  - Dev → `tina`
  - Prod → `main`
- Validate static build output
- Validate SEO metadata

### 4. Deployment Agent

- Configure hosting provider
- Set environment variables
- Verify CMS loads correctly
- Verify production commits work via Auth0 claim

---

## 📄 Output Expectations

A generated site must include:

- `.env.development` with:
  - Repo: Greater-Fox-Cities-Bowling-Association/static-site
  - Branch: tina
  - Local PAT

- `.env.production` with:
  - Repo: Greater-Fox-Cities-Bowling-Association/static-site
  - Branch: main
  - No PAT

- Auth0 claim extraction logic
- Custom CMS admin UI
- Drag‑and‑drop visual editor
- Component builder
- Theme editor
- CSV importer
- GitHub integration
- MUI-based component system
- Fully static Astro site
