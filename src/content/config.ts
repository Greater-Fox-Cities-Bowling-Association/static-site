import { defineCollection, z } from 'astro:content';

// Pages collection removed - will be recreated when CMS is built

// Schema for bowling centers
const centersCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    address: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    phone: z.string(),
    email: z.string().optional(),
    website: z.string().optional(),
    lanes: z.number().optional(),
    features: z.array(z.string()).optional(),
  }),
});

// Schema for tournament information
const tournamentsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    date: z.string(),
    location: z.string(),
    description: z.string(),
    entryFee: z.string().optional(),
    prizeFund: z.string().optional(),
    rules: z.string().optional(),
    contact: z.object({
      name: z.string(),
      phone: z.string(),
      email: z.string(),
    }).optional(),
    status: z.enum(['upcoming', 'completed', 'registration-open']).optional(),
    links: z.array(z.object({
      text: z.string(),
      url: z.string(),
    })).optional(),
  }),
});

// Schema for honors/awards - flexible to support different honor types
const honorsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    category: z.string(), // e.g., "hall-of-fame", "bowler-of-the-year", "high-average", etc.
    title: z.string(), // Display title
    description: z.string().optional(),
    year: z.number().optional(), // For year-specific honors
    // For tabular data (Hall of Fame, Bowler of Year, High Average, etc.)
    data: z.array(z.record(z.any())).optional(),
    // For individual recipients (300 games, etc.)
    recipients: z.array(z.object({
      name: z.string(),
      achievement: z.string().optional(),
      score: z.number().optional(),
      date: z.string().optional(),
      games: z.number().optional(),
      average: z.number().optional(),
      team: z.string().optional(),
      position: z.string().optional(),
    })).optional(),
  }),
});

// Schema for news articles
const newsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    date: z.string(),
    author: z.string().optional(),
    excerpt: z.string(),
    content: z.string(),
    image: z.string().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

// Schema for committee members
const committeesCollection = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    members: z.array(z.object({
      name: z.string(),
      position: z.string(),
      email: z.string().optional(),
      phone: z.string().optional(),
    })),
    description: z.string().optional(),
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
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
});

// Schema for layouts
const layoutSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
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

const sectionSchema = z.discriminatedUnion('type', [
  heroSectionSchema,
  textSectionSchema,
  cardGridSectionSchema,
  ctaSectionSchema,
  contentListSectionSchema,
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
  'centers': centersCollection,
  'tournaments': tournamentsCollection,
  'honors': honorsCollection,
  'news': newsCollection,
  'committees': committeesCollection,
};
