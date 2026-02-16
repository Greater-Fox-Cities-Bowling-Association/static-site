# Theme Editor Implementation Guide

## Overview

I've built a complete theme management system that allows users to create, customize, and manage multiple site-wide themes through an intuitive admin interface. The theme system controls text colors, background colors, fonts, and all primary UI elements across the site.

## What Was Implemented

### 1. **Theme Components** (Already Existed)

- **ThemeEditor.tsx** - Comprehensive form for creating and editing themes
- **ThemeList.tsx** - Shows all available themes with preview of colors/fonts

### 2. **Theme API Functions** (New in `src/utils/githubApi.ts`)

Added complete API integration:

- `fetchThemesDirectory()` - Loads all available themes
- `fetchThemeContent()` - Gets a specific theme's data
- `saveThemeFile()` - Saves new or updated themes
- `deleteThemeFile()` - Removes themes from the system
- `activateTheme()` - Sets a theme as active and deactivates others

### 3. **Theme Loading & Application** (New in `src/utils/themeLoader.ts`)

- `loadActiveTheme()` - Loads the active theme from cache or files
- `applyThemeToCssVariables()` - Applies theme colors as CSS custom properties
- `initializeTheme()` - Main initialization function
- `createThemeStyleSheet()` - Creates dynamic theme stylesheet

### 4. **Admin Interface Integration** (Updated `ImportAdmin.tsx`)

- Added "Theme Manager" button to admin mode selection
- Integrated ThemeList and ThemeEditor components
- Added theme navigation handlers and state management

### 5. **Global Theme Application** (Updated `BaseLayout.astro`)

- Integrated theme loading on page load
- Applied theme colors/fonts as Astro CSS variables
- Ensured all pages use the active theme automatically

## Theme Structure

Each theme is a JSON file in `src/content/themes/` with this structure:

```json
{
  "id": "my-theme",
  "name": "My Custom Theme",
  "description": "A custom theme for the site",
  "isActive": true,
  "colors": {
    "primary": "#2563eb",
    "secondary": "#64748b",
    "background": "#ffffff",
    "text": "#1f2937",
    "textSecondary": "#6b7280",
    "accent": "#3b82f6"
  },
  "fonts": {
    "heading": "Outfit, sans-serif",
    "body": "Inter, system-ui, sans-serif"
  },
  "createdAt": "2026-02-15T00:00:00Z",
  "updatedAt": "2026-02-15T00:00:00Z"
}
```

## Available Fonts

The theme editor includes 13 font family options:

- **Sans Serif**: Inter, Outfit, Roboto, Open Sans, Lato, Montserrat, Poppins, Raleway, Nunito
- **Serif**: Playfair Display, Merriweather, Georgia
- **System**: system-ui, sans-serif

## How to Use

### Creating a New Theme

1. Go to Admin Panel (🏆 GFCBA Admin Panel)
2. Click "Theme Manager" button
3. Click "+ Create Theme"
4. Fill in theme name and description
5. Choose colors using color pickers (supports both visual picker and hex input)
6. Select heading and body fonts
7. Preview your theme in real-time
8. Click "Create Theme" to save

### Editing a Theme

1. In Theme Manager, find your theme in the list
2. Click "Edit"
3. Make your changes
4. Click "Save Changes"

### Activating a Theme

1. In Theme Manager, find the theme you want to use
2. Click "Activate"
3. The theme is now live across the entire site
4. All pages will automatically use the active theme's colors and fonts

### Deleting a Theme

1. In Theme Manager, find a non-active theme
2. Click "Delete"
3. Note: You cannot delete the active theme - activate a different theme first

## How Themes Are Applied

The theme system works in three stages:

### 1. **Server-Side (Astro Build Time)**

- `BaseLayout.astro` loads the active theme during build
- Theme colors are set as CSS custom properties (`--color-primary`, `--color-text`, etc.)
- Ensures first paint includes correct theme colors (no flash)

### 2. **Client-Side Initialization**

- `themeLoader.ts` checks session storage for cached theme
- If not cached, loads from theme JSON files
- Applies theme as CSS variables using `setProperty()`

### 3. **Tailwind CSS Integration**

- The BaseLayout uses Tailwind classes that reference CSS variables
- As styles update, all components automatically use new theme colors
- Components can use `var(--color-primary)` for dynamic styling

## CSS Variables Available

Once a theme is active, these CSS variables are available throughout your site:

```css
--color-primary        /* Main brand color */
--color-secondary      /* Secondary accents */
--color-background     /* Page background */
--color-text           /* Primary text color */
--color-text-secondary /* Secondary text color */
--color-accent         /* Accent highlights */
--font-heading         /* Heading font family */
--font-body           /* Body text font family */
```

## Development vs Production

### In Development

- Themes are loaded from local JSON files (faster)
- Changes save immediately via the `/api/save-page` endpoint
- Can toggle "Test GitHub API" button to test production behavior

### In Production

- Themes are loaded from GitHub repository
- Uses GitHub API authentication
- Themes are stored as part of your repo's content

## Example Use Cases

1. **Multi-Brand Sites** - Create different themes for different sections/brands
2. **Dark Mode** - Create a dark theme variant and let users switch
3. **Seasonal Themes** - Activate holiday themes by switching active theme
4. **A/B Testing** - Test different color schemes by switching themes
5. **Corporate Branding** - Update site colors centrally through theme changes

## Technical Details

### File Locations

- **Components**: `src/components/react/ThemeEditor.tsx`, `ThemeList.tsx`
- **API Functions**: `src/utils/githubApi.ts` (bottom of file)
- **Theme Loader**: `src/utils/themeLoader.ts`
- **Admin Integration**: `src/components/react/ImportAdmin.tsx`
- **Main Layout**: `src/layouts/BaseLayout.astro`
- **Theme Data**: `src/content/themes/*.json`

### Type Definition (in `src/types/cms.ts`)

```typescript
export interface Theme {
  id: string;
  name: string;
  description?: string;
  isActive?: boolean;
  colors: ThemeColors;
  fonts: ThemeFonts;
  createdAt?: string;
  updatedAt?: string;
}
```

## What's Next?

Consider these enhancements:

- Theme preview/live preview on public site
- Theme import/export functionality
- Theme duplication (copy existing theme)
- More granular theme options (spacing, borders, shadows)
- User preference storage (remember theme selection)
- Mobile-specific theme toggles

## Troubleshooting

**Theme not applying?**

- Clear `activeTheme` from session storage
- Check browser console for errors
- Verify theme ID matches the filename

**Colors not changing?**

- Ensure you've clicked "Activate" on the theme
- Check that components use the CSS variables
- Look for inline styles that override CSS variables

**Font not changing?**

- Verify the font is properly imported
- Check Google Fonts are loading properly
- Ensure font name matches exactly (case-sensitive)
