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

export const collections = {
  // 'pages': Pages collection will be recreated with new CMS schema
  'centers': centersCollection,
  'tournaments': tournamentsCollection,
  'honors': honorsCollection,
  'news': newsCollection,
  'committees': committeesCollection,
};
