# Dynamic Collections Update

## Overview

The Content List feature has been updated to support **dynamic, user-defined collection names** instead of hardcoded options. You can now use any collection defined in your `config.ts` file.

## What Changed

### Before

- Collection names were hardcoded: `'centers' | 'tournaments' | 'honors' | 'news' | 'committees'`
- Only these 5 collections could be used in Content List sections
- Adding a new collection type required code changes

### After

- Collection names are dynamic: any `string` value is accepted
- Any collection defined in `config.ts` can be used
- Creating new collections requires only config changes (no code edits)
- Built-in collections still work with optimized display mappings
- Custom collections automatically use intelligent field extraction

## How to Use Custom Collections

### 1. Define Your Collection in config.ts

```typescript
// src/content/config.ts
import { defineCollection, z } from "astro:content";

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

export const collections = {
  pages: pagesCollection,
  layouts: layoutsCollection,
  themes: themesCollection,
  navigation: navigationCollection,
  centers: centersCollection,
  tournaments: tournamentsCollection,
  honors: honorsCollection,
  news: newsCollection,
  committees: committeesCollection,
  sponsors: sponsorsCollection, // Add your new collection
};
```

### 2. Create Collection Folder and Files

```bash
mkdir src/content/sponsors
```

Create `src/content/sponsors/acme-bowling.json`:

```json
{
  "name": "ACME Bowling Supplies",
  "description": "Professional bowling equipment since 1985",
  "logo": "/images/sponsors/acme.png",
  "website": "https://acmebowling.example.com",
  "level": "platinum"
}
```

### 3. Use in Content List Section

In the CMS editor:

1. Add a "Content List" section
2. Enter collection name: `sponsors`
3. Choose display mode and configure options
4. Save and publish

Or manually in a page JSON:

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

## Automatic Field Mapping

### Known Collections (Optimized)

These collections have specific field mappings:

- `centers` - Maps name, city, state, lanes, address, phone, website
- `honors` - Maps title, year, description, recipients
- `news` - Maps title, date, excerpt, author
- `tournaments` - Maps name, date, description, location, status
- `committees` - Maps name, role, description, members

### Custom Collections (Auto-Detected)

For any other collection, the component automatically extracts:

- **Title**: `title` → `name` → item ID
- **Subtitle**: `subtitle` → `date` → `year`
- **Description**: `description` → `excerpt` → `content`
- **Details**: Automatically includes `location`, `author`, `category` if present
- **Link**: `/{collection-name}/{item-id}`

## Files Modified

1. **src/types/cms.ts**
   - Changed `ContentCollectionType` from enum to `string`
   - Updated `ContentListSection.collection` to accept any string

2. **src/content/config.ts**
   - Changed `contentListSectionSchema.collection` from `z.enum([...])` to `z.string()`

3. **src/components/astro/sections/ContentListSection.astro**
   - Enhanced `getItemDisplayData()` with intelligent fallback for custom collections
   - Automatically extracts common fields (title, name, date, etc.)

4. **src/components/react/sections/ContentListEditor.tsx**
   - Replaced dropdown `<select>` with text `<input>` + `<datalist>`
   - Provides suggestions for common collections while allowing custom input
   - Removed unused `ContentCollectionType` import

5. **CONTENT-LIST-GUIDE.md**
   - Updated documentation with custom collection examples
   - Added instructions for creating new collections

## Benefits

1. **Flexibility**: Create any type of content collection without code changes
2. **Scalability**: Add new content types as your site grows
3. **Backward Compatible**: Existing collections continue to work with optimized mappings
4. **Type Safe**: Still validated as strings in Zod schema
5. **User Friendly**: CMS editor shows suggestions but allows custom input
6. **Intelligent**: Auto-detects common fields in custom collections

## Examples of Custom Collections You Could Create

- `sponsors` - Sponsor/partner information
- `staff` - Staff members or board directors
- `events` - Special events (separate from tournaments)
- `leagues` - League information
- `awards` - Award categories and winners
- `locations` - Additional locations or venues
- `resources` - Downloadable resources
- `faqs` - Frequently asked questions
- `testimonials` - User testimonials
- `gallery` - Photo galleries

## Migration Notes

No migration needed! All existing content list sections with `'centers'`, `'honors'`, etc. will continue to work exactly as before. The change is purely additive - it allows new collections without breaking existing ones.

## Testing

To test with a new custom collection:

1. Define the collection in `config.ts`
2. Create a folder in `src/content/`
3. Add at least one `.json` file with data
4. Create or edit a page in the CMS
5. Add a Content List section
6. Enter your custom collection name
7. Preview and adjust display settings

The component will automatically render your collection using intelligent field detection.
