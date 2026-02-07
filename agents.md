🔗 Source Material
Target Site to Recreate: https://www.greaterfoxcitiesba.com
Design Goal: Use the content and structure from the URL above, but apply a modern "Professional Builder" facelift.

🎯 Project Overview
The objective is to build a high-performance, SEO-friendly static website. All content must be managed via local JSON files to ensure compatibility with a Git-based CMS (Decap CMS) and hosted for free/cheap on Static.app.
🛠 Technical Stack
Framework: Astro (SSG Mode)
UI: React + TypeScript
Styling: Tailwind CSS
Content: Astro Content Collections (JSON-driven)
Deployment: GitHub Actions + Static.app CLI

🏗 Architectural Rules
JSON-First: Zero hardcoded content. If it’s text on a page, it must live in src/content/.
SEO Integrity:
Core pages must be static HTML (Astro).
Interactive components (Member Search, Filters) must be React Islands (client:load).
Data Schema:
Define a zod schema in src/content/config.ts for all collections.
Reference the existing greaterfoxcitiesba.com directory for data fields (Name, Phone, Category, etc.).
Professional Builder Aesthetic:
High-impact imagery.
Minimalist, high-contrast typography.
Card-based layouts (Bento-grid) for the member directory.
Mobile-first responsiveness.

📂 Project Structure
text
/src
  /content
    /config.ts    # Zod schemas (Structure data based on GFCBA site)
    /members      # One JSON file per member company
    /pages        # One JSON file per site page
  /components
    /react        # Searchable directory, interactive forms
    /astro        # Navigation, Footers, Card UI
  /layouts
    /BaseLayout.astro # The modern UI shell
  /pages
    /[...slug].astro  # Dynamic routing for JSON content

🚀 CI/CD Requirements
Workflow: .github/workflows/deploy.yml
Task: On every push to main, execute npm run build and deploy the dist/ folder to static.app using the STATIC_APP_API_KEY