# agents.md — Static CMS Template Specification (TinaCMS + Astro)

## 📌 Project Overview
This template defines a fully static, SEO‑optimized website stack using:

- **Astro** for the frontend
- **TinaCMS (open‑source)** for Git‑based content editing
- **Custom TinaCMS plugin** for CSV list importing
- **GitHub** as the only backend
- **Auth0** for authentication into the CMS admin panel
- **No server, no database, no runtime backend**
- **Everything deploys as static files**

This template is designed to be cloned and reused to spin up new sites quickly with minimal configuration.

## 🎯 Primary Goals
- Provide a fully static, SEO‑optimized site with no backend.
- Allow non‑technical users to manage content through TinaCMS.
- Support bulk content import via CSV using a custom Tina plugin.
- Use GitHub as the single source of truth for all content and configuration.
- Use Auth0 for secure login to the CMS admin panel.
- Make the template extensible, themeable, and easy to replicate.

## 🏗️ Architecture Summary

### Frontend
- Framework: Astro
- Rendering: Static Site Generation (SSG)
- Styling: Tailwind or CSS Modules
- SEO: Astro `<head>` management + sitemap + schema.org
- Content: Markdown/JSON/YAML files committed by TinaCMS

### CMS
- TinaCMS served from `/admin/`
- GitHub backend (no external server)
- Schema‑driven content modeling
- Custom plugin: CSV Importer
  - Parses CSV client‑side
  - Maps CSV columns → schema fields
  - Generates multiple content files
  - Commits them to GitHub via Tina’s Git provider

### Auth
- Auth0 SPA login
- Protects `/admin/` route
- TinaCMS loads only after Auth0 session is validated
- GitHub PAT is provided via Auth0 claim:
  https://gfcba.com/github_token

### Hosting
- Any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages)

## 📁 File Structure

/
├─ src/
│  ├─ pages/
│  ├─ components/
│  ├─ layouts/
│  ├─ theme.json
│  └─ content/
├─ public/
│  └─ admin/
│     ├─ index.html
│     ├─ config.ts
│     └─ plugins/
├─ tina/
│  ├─ schema.ts
│  └─ config.ts
├─ .env.development
├─ .env.production
├─ package.json
├─ astro.config.mjs
└─ agents.md

## 🔐 Environment Variables (Development & Production)

This project uses two `.env` files:

- `.env.development`
- `.env.production`

These configure:
- Auth0
- TinaCMS GitHub provider
- GitHub PAT (local or Auth0 claim)
- Astro build/runtime behavior

No Tina Cloud Client ID is required.

## `.env.development`

AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_AUDIENCE=
AUTH0_REDIRECT_URI=http://localhost:4321/admin/
AUTH0_LOGOUT_URI=http://localhost:4321/

TINA_GITHUB_REPO_FULL_NAME=Greater-Fox-Cities-Bowling-Association/static-site
TINA_GITHUB_BRANCH=tina

# GitHub Token (Development Only)
# In production this comes from Auth0 claim: https://gfcba.com/github_token
GITHUB_PAT=

## `.env.production`

AUTH0_DOMAIN=
AUTH0_CLIENT_ID=
AUTH0_AUDIENCE=
AUTH0_REDIRECT_URI=https://yourdomain.com/admin/
AUTH0_LOGOUT_URI=https://yourdomain.com/

TINA_GITHUB_REPO_FULL_NAME=Greater-Fox-Cities-Bowling-Association/static-site
TINA_GITHUB_BRANCH=main

# GitHub Token (Production)
# DO NOT hardcode. Retrieved dynamically from Auth0 claim:
# https://gfcba.com/github_token
GITHUB_PAT=

Production PAT is never stored in `.env.production`.  
It is always retrieved from the Auth0 claim.

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

## 📦 CSV Importer Requirements

### Plugin Behavior
- UI: file upload + preview table
- Parse CSV → JSON
- Validate required fields
- Allow user to map CSV columns → Tina schema fields
- On confirm:
  - Generate multiple files
  - Commit via GitHub provider

### File Generation Rules
- Slug = sanitized value from chosen column
- Output format:
  - Markdown for posts/pages
  - JSON/YAML for lists
- Commit message:
  Bulk import via CSV: {{count}} items

## 🎨 Theme Editor Requirements
- Editable file: `src/theme.json`
- Fields:
  - primaryColor
  - secondaryColor
  - fontFamily
  - fontScale
  - borderRadius
  - layoutStyle
- Astro consumes theme.json at build time
- Optional: generate CSS variables

## 🚀 Deployment Requirements
- Build command: `astro build`
- Output: static HTML + assets
- CMS served from `/admin/`
- Ensure Auth0 callback URLs match production domain
- Ensure production commits target `main`

## 📘 Agent Responsibilities

### 1. Scaffolding Agent
- Create project folder
- Install Astro + dependencies
- Install TinaCMS (open‑source)
- Configure Tina schema
- Create `.env.development` and `.env.production`
- Insert repo + branch values
- Insert Auth0 credentials
- Initialize GitHub repo

### 2. Development Agent
- Implement CSV importer plugin
- Implement theme editor UI
- Ensure Astro reads theme.json
- Add SEO components
- Implement Auth0 claim extraction logic

### 3. Testing Agent
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
- TinaCMS GitHub provider configured to use:
  - `.env.development` token locally
  - Auth0 claim token in production

- CSV importer plugin
- Theme editor
- Fully static Astro site