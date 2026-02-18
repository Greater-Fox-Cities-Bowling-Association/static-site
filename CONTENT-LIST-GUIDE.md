# Content List Feature Guide

## Overview

The **Content List** section type allows you to display items from any of your content collections on any page. Collection names are completely flexible - you can use the built-in collections (centers, honors, news, tournaments, committees) or create your own custom collections. This creates a dynamic link between your data files and your pages, making content easily manageable through the CMS.

## What Problem Does This Solve?

Previously, content collections like `centers`, `honors`, `news`, etc. were isolated data files with no connection to your pages. If you wanted to display a list of bowling centers, you had to manually create cards in a Card Grid section and copy the data. Now, you can reference the collection directly, and all updates to the content files automatically appear on your pages.

## How It Works

### In the CMS

When editing a page in the admin panel:

1. Click **"Add Section"**
2. Select **"Content List"** from the section types
3. Configure the section:
   - **Section Heading**: Optional title for the section
   - **Content Collection**: Enter the collection name from your `config.ts` (e.g., 'centers', 'honors', or any custom collection name)
   - **Display Mode**: How to show the items
     - **Cards**: Grid of cards with images and descriptions
     - **Table**: Structured table format
     - **List**: Vertical list with detailed information
   - **Number of Columns**: For card display (2, 3, or 4 columns)
   - **Item Limit**: Maximum items to display (leave empty to show all)
   - **Specific Items**: Optionally select specific items by ID (leave empty to show all)

### Display Modes

Each display mode presents the content differently:

#### Cards Mode

- Grid layout with configurable columns
- Best for visual content like centers or tournaments
- Shows: title, subtitle, description, details, and link
- Responsive design that adapts to screen size

#### Table Mode

- Structured table with headers
- Best for data-heavy content like honors or records
- Shows: name, details, and action links
- Compact format that fits lots of information

#### List Mode

- Vertical list with detailed information
- Best for news articles or detailed entries
- Shows: full title, description, details, and links
- Easy to scan and read

## Content Collection Mapping

The component intelligently displays data from any collection. For known collections (centers, honors, news, tournaments, committees), it uses optimized field mappings. For custom collections, it automatically extracts common fields like title, name, date, description, etc.

### Centers

- **Title**: Center name
- **Subtitle**: City, State
- **Description**: Number of lanes
- **Details**: Address, phone, website
- **Link**: Center website (opens in new tab)

### Honors

- **Title**: Honor/award title
- **Subtitle**: Year
- **Description**: Award description
- **Details**: Number of recipients
- **Link**: `/honors/{id}` (internal link)

### News

- **Title**: Article title
- **Subtitle**: Publication date
- **Description**: Article excerpt
- **Details**: Author
- **Link**: `/news/{id}` (internal link)

### Tournaments

- **Title**: Tournament name
- **Subtitle**: Tournament date
- **Description**: Tournament description
- **Details**: Location, status
- **Link**: `/tournaments/{id}` (internal link)

### Committees

- **Title**: Committee name
- **Subtitle**: Committee role
- **Description**: Committee description
- **Details**: Number of members
- **Link**: `/committees/{id}` (internal link)

## Example Configurations

### Show All Centers in a 3-Column Grid

```json
{
  "id": "centers-list-1",
  "type": "contentList",
  "order": 1,
  "heading": "Our Bowling Centers",
  "collection": "centers",
  "displayMode": "cards",
  "columns": 3
}
```

### Show Recent News (Last 5 Articles)

```json
{
  "id": "news-list-1",
  "type": "contentList",
  "order": 1,
  "heading": "Latest News",
  "collection": "news",
  "displayMode": "list",
  "limit": 5
}
```

### Show Specific Honor Categories

```json
{
  "id": "honors-list-1",
  "type": "contentList",
  "order": 1,
  "heading": "2025 Achievements",
  "collection": "honors",
  "displayMode": "table",
  "itemIds": ["300-games-2025", "high-average", "bowler-of-the-year"]
}
```

### Show All Tournaments

```json
{
  "id": "tournaments-list-1",
  "type": "contentList",
  "order": 1,
  "heading": "Upcoming Tournaments",
  "collection": "tournaments",
  "displayMode": "cards",
  "columns": 2
}
```

### Custom Collection Example

```json
{
  "id": "sponsors-list-1",
  "type": "contentList",
  "order": 1,
  "heading": "Our Sponsors",
  "collection": "sponsors",
  "displayMode": "cards",
  "columns": 4
}
```

## Managing Content

### Creating Custom Collections

To create a new collection:

1. Open `src/content/config.ts`
2. Define a new collection schema using Zod:

```typescript
const sponsorsCollection = defineCollection({
  type: "data",
  schema: z.object({
    name: z.string(),
    description: z.string(),
    logo: z.string().optional(),
    website: z.string().optional(),
    level: z.enum(["platinum", "gold", "silver", "bronze"]).optional(),
  }),
});
```

3. Add it to the collections export:

```typescript
export const collections = {
  pages: pagesCollection,
  // ... other collections
  sponsors: sponsorsCollection, // Add your new collection
};
```

4. Create a folder `src/content/sponsors/`
5. Add `.json` files with your sponsor data

### Adding New Items

To add a new item to a collection:

1. Use the CSV importer in the admin panel (for bulk imports)
2. Or manually create a `.json` file in the appropriate collection folder:
   - Centers: `src/content/centers/`
   - Honors: `src/content/honors/`
   - News: `src/content/news/`
   - Tournaments: `src/content/tournaments/`
   - Committees: `src/content/committees/`

3. Follow the schema for that collection (see `src/content/config.ts`)

### Editing Items

Items can be edited through:

- The CMS admin panel (if CSV importer is used)
- Direct file editing in the content folders
- GitHub web interface (if using GitHub as CMS backend)

### Removing Items

Simply delete the `.json` file from the collection folder. The page will automatically update to exclude the deleted item.

## Benefits

1. **Single Source of Truth**: Content is defined once in collection files
2. **Automatic Updates**: Changes to content files immediately reflect on pages
3. **Reusability**: Same content can be displayed on multiple pages
4. **Flexibility**: Mix content lists with other section types (hero, text, etc.)
5. **CMS Integration**: Fully manageable through the admin interface
6. **Type Safety**: Full TypeScript support ensures data consistency

## Page Examples

See these pages for working examples:

- [Centers Page](src/content/pages/centers.json) - Displays all bowling centers in card grid
- [Honors Page](src/content/pages/honors.json) - Shows honors and achievements in list format

## Technical Details

### Files Modified/Created

1. **Type Definitions** (`src/types/cms.ts`):
   - Added `ContentListSection` interface
   - Added `ContentCollectionType` and `ContentListDisplayMode` types
   - Updated `SectionType` union type

2. **Schema** (`src/content/config.ts`):
   - Added `contentListSectionSchema` to Zod schema
   - Updated `sectionSchema` discriminated union

3. **Astro Component** (`src/components/astro/sections/ContentListSection.astro`):
   - Renders content lists in all three display modes
   - Automatically fetches and formats data from collections
   - Handles filtering, limiting, and specific item selection

4. **React Editor** (`src/components/react/sections/ContentListEditor.tsx`):
   - CMS interface for configuring content list sections
   - Collection selection, display mode, limits, and item IDs

5. **Page Renderer** (`src/pages/[slug].astro`):
   - Updated to import and render ContentListSection

6. **Page Editor** (`src/components/react/PageEditor.tsx`):
   - Added ContentListEditor to section types
   - Added UI button for creating content list sections

## Future Enhancements

Potential improvements for future versions:

- Search and filter controls on the frontend
- Sorting options (by date, name, etc.)
- Pagination for large lists
- Category/tag filtering
- Custom field mapping for display
- Preview of actual content in CMS editor
- Drag-and-drop item ordering

## Support

If you encounter issues:

1. Check that the collection exists and has data files
2. Verify item IDs match the file names (without `.json`)
3. Ensure the schema in `config.ts` matches your data structure
4. Check browser console for any errors
