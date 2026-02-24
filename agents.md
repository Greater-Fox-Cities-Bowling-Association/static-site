📌 Project Overview
This template defines a fully static, SEO‑optimized website stack using:
- Astro for the frontend (fast, content‑driven, zero‑JS by default)
- Decap CMS for Git‑based content editing
- Custom Decap widget for CSV list importing
- GitHub as the only backend (content storage + versioning)
- Auth0 for authentication into the CMS UI
- No server, no database, no runtime backend
- Everything deploys as static files
This template is designed to be cloned and reused to spin up new sites quickly with minimal configuration.

🎯 Primary Goals
- Provide a fully static, SEO‑optimized site with no server dependencies.
- Allow non‑technical users to manage content through Decap CMS.
- Support bulk content import via CSV using a custom Decap widget.
- Use GitHub as the single source of truth for all content and configuration.
- Use Auth0 for secure login to the CMS admin panel.
- Make the template extensible, themeable, and easy to replicate.

🏗️ Architecture Summary
Frontend
- Framework: Astro
- Rendering: Static Site Generation (SSG)
- Styling: Tailwind or CSS Modules (configurable)
- SEO: Astro’s built‑in <head> management + sitemap + schema.org support
- Content: Pulled from Markdown/JSON/YAML files committed by Decap
CMS
- Decap CMS served from /admin/
- GitHub backend (no external server)
- Custom widget: CSV Importer
- Parses CSV client‑side
- Generates multiple content files
- Commits them to GitHub via Decap’s GitHub backend
- Theme editor:
- Editable theme.json file
- Controls colors, fonts, spacing, layout, etc.
Auth
- Auth0 SPA login
- Protects /admin/ route
- Decap CMS loads only after Auth0 session is validated
Hosting
- Any static host:
- Netlify
- Vercel
- GitHub Pages
- Cloudflare Pages

📁 File Structure
/
├─ src/
│  ├─ pages/
│  ├─ components/
│  ├─ layouts/
│  ├─ theme.json        # Editable via Decap
│  └─ content/          # Markdown/JSON content
│
├─ public/
│  └─ admin/            # Decap CMS
│     ├─ index.html
│     ├─ config.yml
│     └─ widgets/       # Custom CSV widget
│
├─ package.json
├─ astro.config.mjs
├─ agent.md             # This file
└─ README.md



🧩 Decap CMS Configuration Requirements
Collections
- pages (Markdown)
- posts (Markdown)
- lists (JSON or YAML)
- theme (JSON)
- settings (JSON)
Custom Widgets
- csv-import
- Accepts .csv
- Parses via PapaParse
- Maps columns → fields
- Creates multiple new entries
- Commits in a single GitHub commit
Auth0 Integration
- Decap admin UI loads only after:
- Auth0 login
- Token validation
- Auth0 config stored in:
- /public/admin/auth.js
- Environment variables for domain + client ID

🔐 Authentication Flow
- User visits /admin/
- Auth0 SPA SDK checks session
- If not logged in → redirect to Auth0 login
- After login → return to /admin/
- Decap CMS loads with GitHub backend
- User edits content → commits to repo
No server required.

📦 CSV Importer Requirements
Widget Behavior
- UI: file upload + preview table
- Parse CSV → JSON
- Validate required fields
- Allow user to map CSV columns → collection fields
- On confirm:
- Generate multiple files
- Commit via GitHub backend
File Generation Rules
- Slug = sanitized value from a chosen column
- Output format:
- Markdown for posts/pages
- JSON/YAML for lists
- Commit message:
Bulk import via CSV: {{count}} items



🎨 Theme Editor Requirements
- Editable file: src/theme.json
- Fields:
- primaryColor
- secondaryColor
- fontFamily
- fontScale
- borderRadius
- layoutStyle
- Astro consumes theme.json at build time
- Optional: generate CSS variables automatically

🚀 Deployment Requirements
- Build command: astro build
- Output: static HTML + assets
- CMS served from /admin/
- Ensure config.yml uses correct GitHub repo name
- Ensure Auth0 callback URL includes /admin/

📘 Agent Responsibilities
1. Scaffolding Agent
- Create new project folder
- Install Astro + dependencies
- Copy template files
- Configure Decap CMS
- Insert Auth0 credentials
- Initialize GitHub repo
2. Development Agent
- Implement custom CSV widget
- Implement theme editor UI
- Ensure Astro reads theme.json
- Add SEO components
3. Testing Agent
- Validate CSV import flow
- Validate Auth0 login
- Validate Decap commits
- Validate static build output
- Validate SEO metadata
4. Deployment Agent
- Configure hosting provider
- Set environment variables
- Verify CMS loads correctly
- Verify content commits work

📄 Output Expectations
When generating a new site, the agent system should produce:
- A fully working Astro site
- Decap CMS configured and functional
- CSV importer widget included
- Auth0 login protecting /admin/
- GitHub backend connected
- Theme editor working
- Static build ready for deployment
