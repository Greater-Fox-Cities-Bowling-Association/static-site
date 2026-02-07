import { defineCollection, z } from 'astro:content';

// Schema for page content
const pagesCollection = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    slug: z.string(),
    hero: z.object({
      heading: z.string(),
      subheading: z.string().optional(),
      image: z.string().optional(),
      ctaText: z.string().optional(),
      ctaLink: z.string().optional(),
    }).optional(),
    sections: z.array(z.object({
      type: z.enum(['text', 'cards', 'list', 'table', 'hero']),
      heading: z.string().optional(),
      content: z.string().optional(),
      link: z.object({
        text: z.string(),
        url: z.string(),
      }).optional(),
      links: z.array(z.object({
        text: z.string(),
        url: z.string(),
      })).optional(),
      items: z.array(z.any()).optional(),
    })).optional(),
  }),
});

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
  }),
});

// Schema for honors/awards
const honorsCollection = defineCollection({
  type: 'data',
  schema: z.object({
    year: z.number(),
    category: z.string(),
    recipients: z.array(z.object({
      name: z.string(),
      achievement: z.string(),
      score: z.number().optional(),
      date: z.string().optional(),
    })),
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
  'pages': pagesCollection,
  'centers': centersCollection,
  'tournaments': tournamentsCollection,
  'honors': honorsCollection,
  'news': newsCollection,
  'committees': committeesCollection,
};
