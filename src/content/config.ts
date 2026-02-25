import { defineCollection, z } from "astro:content";

const postsCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    publishDate: z.coerce.date().optional(),
    author: z.string().optional(),
    tags: z.array(z.string()).optional(),
    heroImage: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

const pagesCollection = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
});

const settingsCollection = defineCollection({
  type: "data",
  schema: z.object({
    siteTitle: z.string(),
    siteDescription: z.string().optional(),
    siteUrl: z.string().optional(),
    socialLinks: z
      .object({
        twitter: z.string().optional(),
        github: z.string().optional(),
        facebook: z.string().optional(),
      })
      .optional(),
  }),
});

export const collections = {
  posts: postsCollection,
  pages: pagesCollection,
  settings: settingsCollection,
};
