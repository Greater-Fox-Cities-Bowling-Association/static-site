/**
 * public/admin/plugins/csv-importer.js
 *
 * Standalone runtime reference for the CSV Importer plugin.
 *
 * This file documents the client-side API.  The actual TinaCMS plugin
 * implementation lives in:
 *   tina/plugins/csv-importer.ts   — core logic
 *   src/admin/CsvImporterScreen.tsx — React UI (used at build time)
 *
 * These are compiled into the TinaCMS admin bundle by `tinacms build`.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * Standalone usage (outside of TinaCMS, e.g. a custom import script):
 * ─────────────────────────────────────────────────────────────────────────
 *
 *   const { parseCsv, toSlug, generateMarkdown, bulkImportFromCsv }
 *     = await import('/admin/plugins/csv-importer.js');
 *
 *   const token  = localStorage.getItem('tinacms-github-token');
 *   const repo   = 'Greater-Fox-Cities-Bowling-Association/static-site';
 *   const branch = 'main';   // or 'tina' in development
 *
 *   const text = await file.text();
 *   const { rows } = parseCsv(text);
 *
 *   const result = await bulkImportFromCsv(rows, {
 *     collection:   'posts',
 *     contentPath:  'src/content/posts',
 *     slugColumn:   'title',
 *     outputFormat: 'md',
 *     fieldMappings: [
 *       { csvColumn: 'title',       tinaField: 'title' },
 *       { csvColumn: 'description', tinaField: 'description' },
 *       { csvColumn: 'author',      tinaField: 'author' },
 *     ],
 *   }, { repo, branch, token });
 *
 *   console.log('Imported:', result.succeeded);
 *   console.log('Failed:',   result.failed);
 */

// ── parseCsv ────────────────────────────────────────────────────────────────

export function parseCsv(raw) {
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV must have at least a header row and one data row.");

  function parseRow(line) {
    const result = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseRow(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseRow(lines[i]);
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
    rows.push(row);
  }
  return { headers, rows };
}

// ── toSlug ───────────────────────────────────────────────────────────────────

export function toSlug(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// ── generateMarkdown ─────────────────────────────────────────────────────────

export function generateMarkdown(slug, frontmatter, body = "") {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
    .join("\n");
  return { filename: `${slug}.md`, content: `---\n${fm}\n---\n\n${body}\n` };
}

// ── generateJson ──────────────────────────────────────────────────────────────

export function generateJson(slug, data) {
  return { filename: `${slug}.json`, content: JSON.stringify(data, null, 2) + "\n" };
}

// ── commitToGitHub ────────────────────────────────────────────────────────────

export async function commitToGitHub({ repo, branch, token, path, content, message }) {
  const apiBase = "https://api.github.com";
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "Content-Type": "application/json",
    "X-GitHub-Api-Version": "2022-11-28",
  };

  let sha;
  try {
    const r = await fetch(`${apiBase}/repos/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`, { headers });
    if (r.ok) sha = (await r.json()).sha;
  } catch {}

  const body = { message, content: btoa(unescape(encodeURIComponent(content))), branch };
  if (sha) body.sha = sha;

  const res = await fetch(`${apiBase}/repos/${repo}/contents/${path}`, {
    method: "PUT", headers, body: JSON.stringify(body),
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    throw new Error(`GitHub API error ${res.status}: ${e.message ?? res.statusText}`);
  }
}

// ── bulkImportFromCsv ─────────────────────────────────────────────────────────

export async function bulkImportFromCsv(rows, config, githubOpts) {
  const result = { succeeded: [], failed: [] };
  let count = 0;
  for (const row of rows) {
    const slug = toSlug(row[config.slugColumn] ?? `row-${count}`);
    const fields = {};
    for (const m of config.fieldMappings) {
      if (row[m.csvColumn] !== undefined) fields[m.tinaField] = row[m.csvColumn];
    }
    for (const [col, val] of Object.entries(row)) {
      if (!config.fieldMappings.some((m) => m.csvColumn === col)) {
        fields[`csv_${col.replace(/\s+/g, "_")}`] = val;
      }
    }
    try {
      const { filename, content } =
        config.outputFormat === "json" ? generateJson(slug, fields) : generateMarkdown(slug, fields);
      await commitToGitHub({
        ...githubOpts,
        path: `${config.contentPath}/${filename}`,
        content,
        message: `Bulk import via CSV: ${rows.length} items`,
      });
      result.succeeded.push(slug);
    } catch (err) {
      result.failed.push({ slug, error: err.message ?? String(err) });
    }
    count++;
  }
  return result;
}
