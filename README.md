# Greater Fox Cities Bowling Association Website

Modern, high-performance static website for the Greater Fox Cities Bowling Association.

## 🚀 Tech Stack

- **Framework:** Astro (SSG Mode)
- **UI:** React + TypeScript
- **Styling:** Tailwind CSS
- **Content:** JSON-driven with Astro Content Collections
- **Deployment:** GitHub Actions + Static.app

## 🏗️ Project Structure

```
/src
  /content
    /config.ts          # Zod schemas for content validation
    /pages              # Page content (JSON)
    /centers            # Bowling center data (JSON)
    /tournaments        # Tournament information (JSON)
    /news               # News articles (JSON)
    /committees         # Committee information (JSON)
    /honors             # Honors and awards (JSON)
  /components
    /react              # Interactive React components
    /astro              # Static Astro components
  /layouts
    /BaseLayout.astro   # Main layout wrapper
  /pages
    /index.astro        # Home page
    /[slug].astro       # Dynamic page routing
```

## 📦 Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🎨 Design Philosophy

This website follows a **Professional Builder** aesthetic with:

- High-impact imagery and gradients
- Minimalist, high-contrast typography
- Card-based Bento-grid layouts
- Mobile-first responsive design
- Modern color palette with primary blue tones

## 📝 Content Management

All content is managed through JSON files in the `src/content/` directory. This architecture:

- Enables easy content updates without code changes
- Supports integration with Git-based CMS (Decap CMS)
- Maintains type safety through Zod schemas
- Ensures SEO-friendly static HTML generation

### Adding New Content

1. **Pages:** Add a new JSON file to `src/content/pages/`
2. **Centers:** Add a new JSON file to `src/content/centers/`
3. **News:** Add a new JSON file to `src/content/news/`

Each content type has a defined schema in `src/content/config.ts` for validation.

## 🚢 Deployment

The site automatically deploys to Static.app when changes are pushed to the `main` branch.

### Setup

1. Create a Static.app account and get an API key
2. Add the API key as a GitHub secret: `STATIC_APP_API_KEY`
3. Push to main branch - GitHub Actions will handle the rest

## 🔧 Development

### Key Commands

- `npm run dev` - Start dev server at http://localhost:4321
- `npm run build` - Build production site to `dist/`
- `npm run preview` - Preview production build locally
- `npm run astro` - Run Astro CLI commands

### Making Changes

- **Content:** Edit JSON files in `src/content/`
- **Styling:** Modify Tailwind classes or `tailwind.config.mjs`
- **Components:** Update files in `src/components/`
- **Layouts:** Edit files in `src/layouts/`

## 📄 License

© 2026 Greater Fox Cities Bowling Association. All rights reserved.
