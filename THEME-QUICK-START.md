# Theme Editor - Quick Start

## In the Admin Panel

### 1. Navigate to Theme Manager
When you open the admin panel, you'll see four options:
- 📊 CSV Import
- 📄 Page Manager  
- 🎨 Layout Manager
- 🎭 **Theme Manager** ← Click here

### 2. Theme List Screen
You'll see:
- **Active Theme** banner at the top (shows current theme with color preview)
- **List of all themes** with:
  - Theme name and description
  - Color swatches preview
  - Font selections
  - Action buttons:
    - **Edit** - Modify theme colors and fonts
    - **Activate** - Make this the site's active theme
    - **Delete** - Remove unused themes

### 3. Creating a New Theme
Click **+ Create Theme** button

**Form Fields:**
- **Theme Name*** (required) - e.g., "Dark Mode", "Ocean Blues"
- **Description** - e.g., "A dark theme for night browsing"

**Colors Section** (choose from color picker or paste hex code):
- **Primary Color*** - Main brand color, used for buttons and links
- **Secondary Color** - Supporting accent color
- **Background Color*** - Page background
- **Text Color*** - Main text color
- **Secondary Text Color** - Lighter text for meta information
- **Accent Color** - Highlights and hover states

**Typography Section:**
- **Heading Font*** - Font for all headings (h1-h6), select from 13 options
- **Body Font*** - Font for paragraph text and body content

**Live Preview** - See your theme applied to sample text as you make changes

**Buttons:**
- **Cancel** - Discard changes
- **Create Theme** - Save and save as new theme

## Default Themes Included

### default.json
- **Name**: Default Theme
- **Primary**: Blue (#2563eb)
- **Fonts**: Outfit (headings), Inter (body)
- **Status**: Currently active

### bowling-green.json
- **Name**: Bowling Green Theme
- **Primary**: Green color scheme
- **Best for**: Bowling association branding

### dark.json
- **Name**: Dark Theme
- **Primary**: Dark colors with light text
- **Best for**: Night browsing or modern aesthetic

## How Theme Changes Appear

When you **activate** a theme:

✅ **Immediately**
- All nav buttons change color
- Links use the new primary color
- Text color updates
- Fonts change globally

✅ **Throughout Site**
- All pages automatically use the new theme
- Includes public pages, admin pages, etc.
- No need to refresh individual pages

✅ **Persists**
- Theme preference is saved in the repository
- Next visitor will see the activated theme
- In development: saved to local files
- In production: committed to GitHub

## Color Fields Explained

```
Theme Colors
├─ Primary (#2563eb)
│  └─ Used for: Main buttons, primary links, active states
├─ Secondary (#64748b) 
│  └─ Used for: Supporting UI, secondary buttons, borders
├─ Background (#ffffff)
│  └─ Used for: Page background, card backgrounds
├─ Text (#1f2937)
│  └─ Used for: Paragraphs, headings, all text content
├─ Text Secondary (#6b7280)
│  └─ Used for: Meta text, timestamps, helper text, captions
└─ Accent (#3b82f6)
   └─ Used for: Hover effects, highlights, special emphasis
```

## Font Options Available

**Sans Serif (11 options - best for web):**
- Inter, system-ui, sans-serif ⭐ (recommended for body)
- Outfit, sans-serif ⭐ (recommended for headings)
- Roboto, sans-serif
- Open Sans, sans-serif
- Lato, sans-serif
- Montserrat, sans-serif
- Poppins, sans-serif
- Raleway, sans-serif
- Nunito, sans-serif
- system-ui, sans-serif

**Serif (2 options - elegant, traditional):**
- Playfair Display, serif (elegant headings)
- Merriweather, serif (readable body text)
- Georgia, serif (classic web font)

## Pro Tips

💡 **Color Combinations That Work Well:**
- Light background (#f9fafb) + Dark text (#1f2937) + Blue primary (#2563eb)
- Dark background (#1f2937) + Light text (#f9fafb) + Gold primary (#f59e0b)
- White background (#ffffff) + Dark text (#111827) + Green primary (#059669)

💡 **Font Pairings:**
- **Modern**: Outfit + Inter
- **Professional**: Raleway + Open Sans
- **Elegant**: Playfair Display + Merriweather
- **Bold**: Montserrat + Lato
- **Friendly**: Poppins + Inter

💡 **Theme Strategy:**
1. Create one "default" theme with your primary branding
2. Create a "dark" version for contrast/accessibility
3. Create seasonal/event themes as needed
4. Always test with the live preview before activating

## Common Tasks

### Change Site Colors Globally
1. Edit the active theme
2. Update colors
3. Click "Save Changes"
4. **Done!** All pages update automatically

### Switch Between Presets
1. In Theme Manager, find your desired theme
2. Click "Activate"
3. **Done!** Site immediately switches

### Remove a Theme (after creating too many)
1. If it's active, activate a different one first
2. Click "Delete" on the theme
3. Confirm deletion

### Clone an Existing Theme
1. Click "Edit" on the theme you want to copy
2. Save it with a new name (no native clone button yet)
3. Make your modifications
4. Save as new theme

## Architecture Behind the Scenes

### How It Works:
```
Theme Files (src/content/themes/*.json)
    ↓
Theme API Functions (src/utils/githubApi.ts)
    ↓
ThemeList Component (shows all, lets you activate)
    ↓
ThemeEditor Component (create/edit)
    ↓
Admin Panel Integration (ImportAdmin.tsx)
    ↓
Theme Loader (src/utils/themeLoader.ts)
    ↓
BaseLayout (applies CSS variables)
    ↓
Global CSS Variables Available Throughout Site
    ↓
All Pages/Components Automatically Themed
```

### Where Theme Data Lives:
- **Source**: `src/content/themes/*.json` files
- **Dev**: Local file system (fast, immediate)
- **Prod**: GitHub repository (committed changes)

## FAQ

**Q: Can multiple users have different themes?**
A: Not yet - themes are site-wide. One active theme for all visitors. (Future feature: user preferences)

**Q: Will theme changes break my custom CSS?**
A: No - theme colors are CSS variables that sit on top of your base styles.

**Q: Can I import/export themes?**
A: Not yet - but JSON files are basically importable. Copy the theme JSON to `src/content/themes/` folder.

**Q: Is there a theme preview on the public site?**
A: Not yet - but you can see live preview in the editor before activating.

**Q: Can I revert a theme change?**
A: Yes - activate a previous theme. All versions stay in your repo history.

