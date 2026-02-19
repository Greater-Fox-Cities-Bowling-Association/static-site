# Collection Management Guide

## Overview

You can now create and manage custom content collections directly through the CMS interface without editing code!

## How to Access

1. Navigate to `/admin` in your browser
2. Log in with Auth0
3. Click on the **"Collections"** card (📦 icon)

## Creating a New Collection

1. Click the **"Create New Collection"** button
2. Fill in the collection details:
   - **Collection Name**: Use lowercase letters, numbers, and hyphens (e.g., `honors`, `tournaments`, `centers`)
   - **Description**: Optional brief description of the collection
3. Add fields to your collection schema:
   - Click **"+ Add Field"**
   - For each field, specify:
     - **Field Name**: The property name (e.g., `title`, `date`, `score`)
     - **Field Type**: Choose from:
       - Text (string)
       - Number
       - True/False (boolean)
       - List (array)
       - Object
       - Date
     - **Description**: Optional field description
     - **Required**: Check if the field is mandatory
4. Click **"Create Collection"** to save

## Editing an Existing Collection

1. From the Collections list, find the collection you want to edit
2. Click the **"Edit"** button
3. Modify the fields as needed:
   - Add new fields
   - Remove existing fields
   - Update field properties
   - Change descriptions
4. Click **"Update Collection"** to save changes

## Important Notes

⚠️ **Schema Changes**: Changing a collection's schema may affect existing content. Make sure to update your content items to match the new schema.

🔒 **Collection Name**: Once created, the collection name cannot be changed. If you need a different name, create a new collection and migrate your content.

## How Collections Work

### In Development Mode

- Toggle **"Use GitHub API"** to switch between:
  - **OFF (Local)**: Changes save to your local `src/content/` directory
  - **ON (GitHub)**: Changes commit directly to your GitHub repository

### Collection Schema Storage

- Collection schemas are stored in `src/content/config.ts`
- The system automatically:
  - Reads existing collections from the config
  - Updates the config when you create/edit collections
  - Validates content against the schema

### Collection Content

- Individual content items are stored in `src/content/[collection-name]/`
- Each item is a JSON file with fields matching your schema
- You can manage content items through the CMS or by editing JSON files directly

## Example: Creating a "Hall of Fame" Collection

1. Collection Name: `hall-of-fame`
2. Description: `Hall of Fame inductees by year`
3. Fields:
   - `year` (Number, Required)
   - `name` (Text, Required)
   - `category` (Text, Required)
   - `achievements` (List, Optional)
   - `bio` (Text, Optional)
   - `inductionDate` (Date, Required)

## API Functions Used

The collection management system uses these GitHub API functions:

- `getCollections()` - Lists all available collections
- `getCollection(name)` - Gets a specific collection schema
- `saveCollection(schema)` - Creates or updates a collection schema

## Troubleshooting

**Issue**: Collections not loading

- **Solution**: Make sure you're logged in and have a valid GitHub token

**Issue**: Save fails

- **Solution**: Check that all required fields are filled and field names are valid

**Issue**: Changes not appearing

- **Solution**: In dev mode, toggle "Use GitHub API" to force a refresh

## Next Steps

After creating a collection, you can:

1. Import content via CSV (use the CSV Import tool)
2. Create individual items through the CMS
3. Display the collection on your site using Astro's content collections API

For more information on using collections in your site, see the [Astro Content Collections documentation](https://docs.astro.build/en/guides/content-collections/).
