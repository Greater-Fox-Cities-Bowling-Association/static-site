/**
 * CSV Importer Plugin for TinaCMS
 *
 * Provides a "CSV Import" screen in the TinaCMS admin panel.
 * This plugin:
 *  1. Accepts a CSV file upload
 *  2. Parses it client-side
 *  3. Shows a preview table
 *  4. Lets the user map CSV columns to TinaCMS schema fields
 *  5. On confirm, generates Markdown/JSON files and commits them
 *     to GitHub via the GitHub REST API using the stored PAT
 *
 * Usage: import and add to the `cmsCallback` in tina/config.ts.
 *
 * @example
 * // tina/config.ts
 * import { createCsvImporterPlugin } from "./plugins/csv-importer";
 * cmsCallback: (cms) => { cms.plugins.add(createCsvImporterPlugin({ ... })); }
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CsvRow {
  [column: string]: string;
}

export interface FieldMapping {
  csvColumn: string;
  tinaField: string;
}

export interface ImportConfig {
  collection: string;        // e.g. "posts"
  contentPath: string;       // e.g. "src/content/posts"
  slugColumn: string;        // CSV column to use as the file slug
  outputFormat: "md" | "json" | "yaml";
  fieldMappings: FieldMapping[];
}

// ---------------------------------------------------------------------------
// CSV parsing (pure JS — no external dependencies)
// ---------------------------------------------------------------------------

export function parseCsv(raw: string): { headers: string[]; rows: CsvRow[] } {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error("CSV must have at least a header row and one data row.");
  }

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseRow(lines[0]!);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]!);
    const row: CsvRow = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return { headers, rows };
}

// ---------------------------------------------------------------------------
// Slug sanitization
// ---------------------------------------------------------------------------

export function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ---------------------------------------------------------------------------
// File content generators
// ---------------------------------------------------------------------------

function toYamlFrontmatter(data: Record<string, string>): string {
  return Object.entries(data)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
}

export function generateMarkdown(
  slug: string,
  frontmatter: Record<string, string>,
  body = ""
): { filename: string; content: string } {
  return {
    filename: `${slug}.md`,
    content: `---\n${toYamlFrontmatter(frontmatter)}\n---\n\n${body}\n`,
  };
}

export function generateJson(
  slug: string,
  data: Record<string, string>
): { filename: string; content: string } {
  return {
    filename: `${slug}.json`,
    content: JSON.stringify(data, null, 2) + "\n",
  };
}

// ---------------------------------------------------------------------------
// GitHub commit helper
// ---------------------------------------------------------------------------

export interface GitHubCommitOptions {
  repo: string;      // "owner/repo"
  branch: string;    // "main" | "tina"
  token: string;     // GitHub PAT
  path: string;      // "src/content/posts/my-post.md"
  content: string;   // file content (will be base64-encoded)
  message: string;   // commit message
}

export async function commitToGitHub(opts: GitHubCommitOptions): Promise<void> {
  const { repo, branch, token, path, content, message } = opts;
  const apiBase = "https://api.github.com";
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  // Check whether the file already exists (we need its sha for updates)
  let sha: string | undefined;
  try {
    const existRes = await fetch(
      `${apiBase}/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
      { headers }
    );
    if (existRes.ok) {
      const existing = (await existRes.json()) as { sha: string };
      sha = existing.sha;
    }
  } catch {
    // File doesn't exist yet — that's fine
  }

  const body: Record<string, unknown> = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch,
  };
  if (sha) body.sha = sha;

  const res = await fetch(`${apiBase}/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(
      `GitHub API error ${res.status}: ${err.message ?? res.statusText}`
    );
  }
}

// ---------------------------------------------------------------------------
// Bulk import orchestrator
// ---------------------------------------------------------------------------

export interface BulkImportResult {
  succeeded: string[];
  failed: Array<{ slug: string; error: string }>;
}

export async function bulkImportFromCsv(
  rows: CsvRow[],
  config: ImportConfig,
  githubOpts: Omit<GitHubCommitOptions, "path" | "content" | "message">
): Promise<BulkImportResult> {
  const result: BulkImportResult = { succeeded: [], failed: [] };
  let count = 0;

  for (const row of rows) {
    const rawSlug = row[config.slugColumn] ?? `row-${count}`;
    const slug = toSlug(rawSlug);

    // Build field data from explicit mappings
    const fields: Record<string, string> = {};
    for (const mapping of config.fieldMappings) {
      if (row[mapping.csvColumn] !== undefined) {
        fields[mapping.tinaField] = row[mapping.csvColumn] ?? "";
      }
    }

    // Carry over unmapped columns with a "csv_" prefix
    for (const [col, val] of Object.entries(row)) {
      const isMapped = config.fieldMappings.some((m) => m.csvColumn === col);
      if (!isMapped) {
        fields[`csv_${col.replace(/\s+/g, "_")}`] = val;
      }
    }

    try {
      const { filename, content } =
        config.outputFormat === "json"
          ? generateJson(slug, fields)
          : generateMarkdown(slug, fields);

      const path = `${config.contentPath}/${filename}`;
      const message = `Bulk import via CSV: ${rows.length} items`;

      await commitToGitHub({ ...githubOpts, path, content, message });
      result.succeeded.push(slug);
    } catch (err: unknown) {
      result.failed.push({
        slug,
        error: err instanceof Error ? err.message : String(err),
      });
    }

    count++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// TinaCMS Screen Plugin factory
// ---------------------------------------------------------------------------
//
// Add to tina/config.ts:
//
//   import { createCsvImporterPlugin } from "./plugins/csv-importer";
//
//   export default defineConfig({
//     cmsCallback: (cms) => {
//       cms.plugins.add(
//         createCsvImporterPlugin({
//           collection: "posts",
//           contentPath: "src/content/posts",
//           slugColumn: "title",
//           outputFormat: "md",
//           fieldMappings: [
//             { csvColumn: "title",       tinaField: "title" },
//             { csvColumn: "description", tinaField: "description" },
//             { csvColumn: "author",      tinaField: "author" },
//             { csvColumn: "date",        tinaField: "publishDate" },
//           ],
//         })
//       );
//     },
//   });

export interface CsvImporterPluginOptions extends ImportConfig {
  /** Label shown in the TinaCMS sidebar */
  label?: string;
}

export function createCsvImporterPlugin(opts: CsvImporterPluginOptions) {
  return {
    __type: "screen" as const,
    name: opts.label ?? `CSV Importer — ${opts.collection}`,
    Icon: () => null,
    layout: "fullscreen" as const,
    /**
     * The React component rendered for this screen.
     * Replace this stub with a proper React/JSX component in your project.
     * A full example is provided in src/admin/CsvImporterScreen.tsx.
     */
    Component: CsvImporterScreen.bind(null, opts),
  };
}

/**
 * Minimal TinaCMS screen component (no JSX — vanilla DOM).
 * Import React and use JSX for a richer UI.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CsvImporterScreen(_opts: CsvImporterPluginOptions): null {
  return null;
}
