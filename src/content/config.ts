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

const sectionSchema = z.discriminatedUnion('type', [
  heroSectionSchema,
  textSectionSchema,
  cardGridSectionSchema,
  ctaSectionSchema,
]);

const pagesCollection = defineCollection({
  type: 'data',
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    metaDescription: z.string().optional(),
    status: z.enum(['draft', 'published']),
    isLandingPage: z.boolean().optional(),
    sections: z.array(sectionSchema),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  }),
});

export const collections = {
  'pages': pagesCollection,
  'centers': centersCollection,
  'tournaments': tournamentsCollection,
  'honors': honorsCollection,
  'news': newsCollection,
  'committees': committeesCollection,
};
