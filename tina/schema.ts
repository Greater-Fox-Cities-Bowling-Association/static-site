import { defineSchema } from "tinacms";
import type { TinaCollection } from "tinacms";

// Define the post collection
const postCollection: TinaCollection = {
  name: "post",
  label: "Posts",
  path: "src/content/posts",
  format: "md",
  fields: [
    {
      type: "string",
      name: "title",
      label: "Title",
      isTitle: true,
      required: true,
    },
    {
      type: "string",
      name: "description",
      label: "Description",
    },
    {
      type: "datetime",
      name: "publishDate",
      label: "Publish Date",
    },
    {
      type: "string",
      name: "author",
      label: "Author",
    },
    {
      type: "string",
      name: "tags",
      label: "Tags",
      list: true,
    },
    {
      type: "image",
      name: "heroImage",
      label: "Hero Image",
    },
    {
      type: "rich-text",
      name: "body",
      label: "Body",
      isBody: true,
    },
  ],
};

// Define the page collection
const pageCollection: TinaCollection = {
  name: "page",
  label: "Pages",
  path: "src/content/pages",
  format: "md",
  fields: [
    {
      type: "string",
      name: "title",
      label: "Title",
      isTitle: true,
      required: true,
    },
    {
      type: "string",
      name: "description",
      label: "Description",
    },
    {
      type: "rich-text",
      name: "body",
      label: "Body",
      isBody: true,
    },
  ],
};

// Define the settings collection
const settingsCollection: TinaCollection = {
  name: "settings",
  label: "Site Settings",
  path: "src/content/settings",
  format: "json",
  fields: [
    {
      type: "string",
      name: "siteTitle",
      label: "Site Title",
      required: true,
    },
    {
      type: "string",
      name: "siteDescription",
      label: "Site Description",
    },
    {
      type: "string",
      name: "siteUrl",
      label: "Site URL",
    },
    {
      type: "object",
      name: "socialLinks",
      label: "Social Links",
      fields: [
        { type: "string", name: "twitter", label: "Twitter" },
        { type: "string", name: "github", label: "GitHub" },
        { type: "string", name: "facebook", label: "Facebook" },
      ],
    },
  ],
};

// Define the theme collection
const themeCollection: TinaCollection = {
  name: "theme",
  label: "Theme",
  path: "src",
  format: "json",
  match: { include: "theme" },
  fields: [
    {
      type: "string",
      name: "primaryColor",
      label: "Primary Color",
      ui: { component: "color" },
    },
    {
      type: "string",
      name: "secondaryColor",
      label: "Secondary Color",
      ui: { component: "color" },
    },
    {
      type: "string",
      name: "fontFamily",
      label: "Font Family",
      options: ["Inter", "Roboto", "Open Sans", "Lato", "Poppins", "Georgia", "Merriweather"],
    },
    {
      type: "number",
      name: "fontScale",
      label: "Font Scale",
    },
    {
      type: "string",
      name: "borderRadius",
      label: "Border Radius",
      options: ["none", "sm", "md", "lg", "full"],
    },
    {
      type: "string",
      name: "layoutStyle",
      label: "Layout Style",
      options: ["centered", "wide", "full"],
    },
  ],
};

export const schema = defineSchema({
  collections: [postCollection, pageCollection, settingsCollection, themeCollection],
});
