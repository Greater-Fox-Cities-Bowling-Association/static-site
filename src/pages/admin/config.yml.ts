// src/pages/admin/config.yml.ts
// Generates the Decap CMS config.yml dynamically from environment variables
// so the GitHub repo, site URL, and branch never need to be hardcoded.

import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ request }) => {
  const repo      = import.meta.env.PUBLIC_GITHUB_REPO     ?? 'YOUR_USERNAME/YOUR_REPO';
  const branch    = import.meta.env.PUBLIC_GITHUB_BRANCH   ?? 'main';
  const baseUrl   = import.meta.env.PUBLIC_GITHUB_BASE_URL ?? 'https://api.netlify.com';
  const siteUrl   = import.meta.env.PUBLIC_SITE_URL        ?? 'https://your-domain.com';

  const yaml = `
backend:
  name: github
  repo: ${repo}
  branch: ${branch}
  base_url: ${baseUrl}
  auth_endpoint: auth

# local_backend: true   # Uncomment for local dev (no GitHub required)

media_folder: public/uploads
public_folder: /uploads

site_url: ${siteUrl}
display_url: ${siteUrl}

collections:
  # Pages collection
  - name: pages
    label: Pages
    folder: src/content/pages
    create: true
    slug: "{{slug}}"
    extension: md
    format: frontmatter
    fields:
      - { label: Title, name: title, widget: string }
      - { label: Description, name: description, widget: string, required: false }
      - { label: Date, name: date, widget: datetime, required: false }
      - { label: Draft, name: draft, widget: boolean, default: false }
      - { label: Body, name: body, widget: markdown }

  # Posts collection
  - name: posts
    label: Blog Posts
    folder: src/content/posts
    create: true
    slug: "{{slug}}"
    extension: md
    format: frontmatter
    fields:
      - { label: Title, name: title, widget: string }
      - { label: Description, name: description, widget: string, required: false }
      - { label: Date, name: date, widget: datetime }
      - { label: Tags, name: tags, widget: list, default: [], required: false }
      - { label: Author, name: author, widget: string, required: false }
      - { label: Draft, name: draft, widget: boolean, default: false }
      - { label: Body, name: body, widget: markdown }

  # Lists collection
  - name: lists
    label: Lists
    folder: src/content/lists
    create: true
    slug: "{{slug}}"
    extension: json
    format: json
    fields:
      - { label: Title, name: title, widget: string }
      - label: Items
        name: items
        widget: list
        fields:
          - { label: Label, name: label, widget: string }
          - { label: Value, name: value, widget: string }

  # Theme settings
  - name: theme
    label: Theme
    files:
      - label: Theme Settings
        name: theme
        file: src/theme.json
        fields:
          - { label: Primary Color, name: primaryColor, widget: color, default: "#2563eb" }
          - { label: Secondary Color, name: secondaryColor, widget: color, default: "#7c3aed" }
          - { label: Font Family, name: fontFamily, widget: string, default: "system-ui, sans-serif" }
          - { label: Font Scale, name: fontScale, widget: number, default: 1, value_type: float, min: 0.75, max: 1.5, step: 0.05 }
          - { label: Border Radius, name: borderRadius, widget: string, default: "0.5rem" }
          - label: Layout Style
            name: layoutStyle
            widget: select
            options: [centered, wide, full]
            default: centered

  # Site Settings
  - name: settings
    label: Settings
    files:
      - label: Site Settings
        name: main
        file: src/content/settings/main.json
        fields:
          - { label: Site Title, name: siteTitle, widget: string }
          - { label: Site Description, name: siteDescription, widget: string }
          - { label: Site URL, name: siteUrl, widget: string, required: false }
          - { label: Logo, name: logo, widget: image, required: false }
          - label: Navigation
            name: nav
            widget: list
            fields:
              - { label: Label, name: label, widget: string }
              - { label: Link, name: href, widget: string }
          - { label: Footer Text, name: footer, widget: string, required: false }
`.trimStart();

  return new Response(yaml, {
    headers: { 'Content-Type': 'text/yaml; charset=utf-8' },
  });
};
