import { defineCollection, z } from 'astro:content';

// ── User-defined collection definitions ───────────────────────────────────────
// Data collections (centers, tournaments, honors, etc.) are NOT registered here.
// Their shape is described by the user via collection-def JSON files in
// src/content/collection-defs/. Items are loaded at render time via import.meta.glob.

const collectionFieldSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    name: z.string(),
    label: z.string(),
    type: z.enum(['string', 'number', 'boolean', 'select', 'date', 'array', 'object']),
    required: z.boolean().optional(),
    options: z.array(z.string()).optional(),       // for 'select' type
    description: z.string().optional(),
    arrayFields: z.array(collectionFieldSchema).optional(), // nested fields for 'array' type
  })
);

const collectionDefsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    icon: z.string().optional(),
    displayField: z.string().optional(),   // which field is the "title" in list views
    summaryField: z.string().optional(),   // which field is the "description" in list views
    fields: z.array(collectionFieldSchema),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
});

// Schema for themes
const themesCollection = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    isActive: z.boolean().optional().default(false),
    colors: z.object({
      primary: z.string(),
      secondary: z.string(),
      background: z.string(),
      text: z.string(),
      textSecondary: z.string().optional(),
      accent: z.string().optional(),
    }),
    fonts: z.object({
      heading: z.string(),
      body: z.string(),
    }),
    spacing: z.record(z.string()).optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
});

// Schema for layouts
const layoutSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  navigationId: z.string().optional(), // which navigation menu this layout uses
  header: z.object({
    showNavigation: z.boolean(),
    navigationStyle: z.enum(['default', 'minimal', 'full']),
    customNavigation: z.boolean().optional(),
  }),
  footer: z.object({
    showFooter: z.boolean(),
    footerStyle: z.enum(['default', 'minimal', 'full']).optional(),
    customFooter: z.boolean().optional(),
  }),
});

const layoutsCollection = defineCollection({
  type: 'data',
  schema: layoutSchema,
});

// Navigation collection - for managing navigation menus
const navigationItemSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    id: z.string(),
    label: z.string(),
    href: z.string(),
    order: z.number(),
    children: z.array(navigationItemSchema).optional(),
  })
);

const navigationCollection = defineCollection({
  type: 'data',
  schema: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    items: z.array(navigationItemSchema),
    updatedAt: z.string().optional(),
  }),
});

// Pages collection - CMS-managed pages
const cardSchema = z.object({
  title: z.string(),
  description: z.string(),
  imageUrl: z.string().optional(),
  link: z.string().optional(),
});

const baseSectionSchema = z.object({
  id: z.string(),
  order: z.number(),
  // Children allow any depth of nesting; validated loosely to avoid circular-type issues
  children: z.array(z.any()).optional(),
  styleOverrides: z.object({
    backgroundColor: z.string().optional(),
    backgroundImage: z.string().optional(),
    backgroundSize: z.enum(['cover', 'contain', 'auto']).optional(),
    backgroundPosition: z.string().optional(),
    textColor: z.string().optional(),
    paddingTop: z.string().optional(),
    paddingBottom: z.string().optional(),
    customClasses: z.string().optional(),
  }).optional(),
});

const heroSectionSchema = baseSectionSchema.extend({
  type: z.literal('hero'),
  title: z.string(),
  subtitle: z.string().optional(),
  backgroundImage: z.string().optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
});

const textSectionSchema = baseSectionSchema.extend({
  type: z.literal('text'),
  heading: z.string().optional(),
  content: z.string(),
});

const cardGridSectionSchema = baseSectionSchema.extend({
  type: z.literal('cardGrid'),
  heading: z.string().optional(),
  cards: z.array(cardSchema),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
});

const ctaSectionSchema = baseSectionSchema.extend({
  type: z.literal('cta'),
  heading: z.string(),
  buttonText: z.string(),
  buttonLink: z.string(),
  style: z.enum(['primary', 'secondary']),
});

const contentListSectionSchema = baseSectionSchema.extend({
  type: z.literal('contentList'),
  heading: z.string().optional(),
  collection: z.string(), // Any collection name defined in config.ts (e.g., 'centers', 'honors', etc.)
  displayMode: z.enum(['cards', 'table', 'list']),
  itemIds: z.array(z.string()).optional(),
  limit: z.number().optional(),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).optional(),
  showFilters: z.boolean().optional(),
});

// Composite component section — rendered by looking up the composite definition
const componentSectionSchema = baseSectionSchema.extend({
  type: z.literal('component'),
  componentId: z.string(),
  componentType: z.enum(['primitive', 'composite']).optional(),
  columns: z.number().optional(),
  data: z.record(z.any()).optional(),
  label: z.string().optional(),
});

const sectionSchema = z.discriminatedUnion('type', [
  heroSectionSchema,
  textSectionSchema,
  cardGridSectionSchema,
  ctaSectionSchema,
  contentListSectionSchema,
  componentSectionSchema,
]);

const pagesCollection = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    metaDescription: z.string().optional(),
    status: z.enum(['draft', 'published']),
    isLandingPage: z.boolean().optional(),
    layoutId: z.string().optional(),
    useLayout: z.boolean().optional().default(true),
    sections: z.array(sectionSchema),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
});

export const collections = {
  'pages': pagesCollection,
  'layouts': layoutsCollection,
  'themes': themesCollection,
  'navigation': navigationCollection,
  'collection-defs': collectionDefsCollection,
};
