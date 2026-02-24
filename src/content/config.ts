import { defineCollection, z } from 'astro:content';

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.date().optional(),
    draft: z.boolean().default(false),
  }),
});

const posts = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    date: z.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
    author: z.string().optional(),
  }),
});

const lists = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    items: z.array(z.record(z.string(), z.unknown())),
  }),
});

const settings = defineCollection({
  type: 'data',
  schema: z.object({
    siteTitle: z.string(),
    siteDescription: z.string(),
    siteUrl: z.string().optional(),
    logo: z.string().optional(),
    nav: z.array(z.object({ label: z.string(), href: z.string() })).default([]),
    footer: z.string().optional(),
  }),
});

export const collections = { pages, posts, lists, settings };
