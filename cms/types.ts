/**
 * Shared types for the CMS.
 * Content pages are plain JSON objects — no component tree, no layout nodes.
 */

export interface ContentPage {
  slug: string;
  title: string;
  description?: string;
  /** Raw HTML body rendered in the page template */
  body?: string;
  /** Any extra fields stored in the JSON file */
  [key: string]: unknown;
}
