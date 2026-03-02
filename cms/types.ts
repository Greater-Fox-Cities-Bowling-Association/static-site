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

// ─── Versioning ───────────────────────────────────────────────────────────────

/**
 * A single immutable snapshot of a content entry's field data.
 */
export interface ContentVersion {
  /** Monotonically increasing version number (1, 2, 3, …) */
  version: number;
  /** ISO 8601 timestamp of when this version was created */
  createdAt: string;
  /** Optional human-readable label, e.g. "Spring update" */
  label?: string;
  /** The content field values for this version */
  data: Record<string, unknown>;
}

/**
 * A versioned CMS entry stored in a JSON file.
 * The file always contains the full version history; the build renders only
 * the published version.
 */
export interface VersionedCmsEntry {
  /** URL path segment — matches the file name without extension */
  slug: string;
  /** ID of the CmsSchema that governs this entry, e.g. "home" */
  _schemaId: string;
  /** The version number that is currently live on the built site */
  _publishedVersion: number;
  /** Complete history of all saved versions, oldest first */
  _versions: ContentVersion[];
}

/**
 * Returns true if `data` is a versioned entry (has _versions array).
 */
export function isVersioned(data: unknown): data is VersionedCmsEntry {
  return (
    typeof data === 'object' &&
    data !== null &&
    '_versions' in data &&
    Array.isArray((data as Record<string, unknown>)['_versions']) &&
    '_publishedVersion' in data
  );
}

/**
 * Extracts the published version's field data merged with top-level metadata.
 * Throws if the published version number is not found in the history.
 */
export function resolvePublished(
  entry: VersionedCmsEntry
): Record<string, unknown> {
  const v = entry._versions.find((v) => v.version === entry._publishedVersion);
  if (!v) {
    throw new Error(
      `Published version ${entry._publishedVersion} not found in _versions for slug "${entry.slug}"`
    );
  }
  return { slug: entry.slug, _schemaId: entry._schemaId, ...v.data };
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
