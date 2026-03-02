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

// ─── Schema System ────────────────────────────────────────────────────────────

/**
 * Primitive field types supported by the dynamic form renderer.
 */
export type CmsFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'slug'
  | 'date'
  | 'array';

/**
 * Definition of a single field within a content type schema.
 */
export interface CmsField {
  /** Internal key used as the JSON property name */
  name: string;
  /** Human-readable label shown in the admin form */
  label: string;
  /** Field type determines which input component is rendered */
  type: CmsFieldType;
  /** Whether the field must be non-empty to save */
  required?: boolean;
  /** Helper text shown below the input */
  helpText?: string;
  /** For type 'array': the primitive type of each item */
  of?: Exclude<CmsFieldType, 'array'>;
  /** For type 'textarea': maximum character limit (shows counter in UI) */
  maxLength?: number;
}

/**
 * A content type schema — defines the shape of entries in one collection.
 * Stored as a JSON file at cms/schemas/{id}.schema.json in GitHub.
 */
export interface CmsSchema {
  /** Unique identifier; also used as the content directory name under src/content/{id}/ */
  id: string;
  /** Human-readable name shown in the admin sidebar */
  name: string;
  /** Path to the directory where entries are stored, e.g. "src/content/pages" */
  directory: string;
  /** Ordered list of fields for this content type */
  fields: CmsField[];
}

/**
 * A generic CMS entry — the shape of any file managed by a CmsSchema.
 */
export type CmsEntry = Record<string, unknown>;
