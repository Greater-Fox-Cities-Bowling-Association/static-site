/**
 * githubSchemas.ts
 * Helpers for reading CMS schema definitions from GitHub.
 * Schemas live at cms/schemas/{id}.schema.json in the repository.
 */

import { listDirectory, fetchFileContent } from './githubContent';
import type { CmsSchema } from '../types';

const SCHEMAS_PATH = 'cms/schemas';

/**
 * Lists all schema files from the cms/schemas/ directory and returns
 * the parsed CmsSchema objects.
 */
export async function listSchemas(
  token: string,
  repo: string,
  branch: string
): Promise<CmsSchema[]> {
  const files = await listDirectory(token, repo, branch, SCHEMAS_PATH);
  const schemaFiles = files.filter(
    (f) => f.type === 'file' && f.name.endsWith('.schema.json')
  );

  const schemas = await Promise.all(
    schemaFiles.map(async (f) => {
      const raw = await fetchFileContent(token, repo, branch, f.path);
      return JSON.parse(raw) as CmsSchema;
    })
  );

  return schemas.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Fetches and parses a single schema by id.
 * Returns null if the schema file does not exist.
 */
export async function fetchSchema(
  token: string,
  repo: string,
  branch: string,
  id: string
): Promise<CmsSchema | null> {
  try {
    const raw = await fetchFileContent(
      token,
      repo,
      branch,
      `${SCHEMAS_PATH}/${id}.schema.json`
    );
    return JSON.parse(raw) as CmsSchema;
  } catch {
    return null;
  }
}
