/** @jsxImportSource react */
/**
 * CsvImporterScreen — React UI component for the TinaCMS CSV Importer plugin.
 * 
 * This is the full React/JSX UI version of the screen.  Replace the stub
 * `Component` in createCsvImporterPlugin (tina/plugins/csv-importer.ts)
 * with this component for a rich import experience.
 *
 * Usage:
 *   import { CsvImporterScreen } from "../src/admin/CsvImporterScreen";
 *   // then in createCsvImporterPlugin return this as Component
 */

import React, { useState, useCallback } from "react";
import {
  parseCsv,
  bulkImportFromCsv,
  type CsvRow,
  type FieldMapping,
  type CsvImporterPluginOptions,
  type BulkImportResult,
} from "../../tina/plugins/csv-importer";

const TOKEN_KEY = "tinacms-github-token";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getEnv(key: string): string {
  return (
    (typeof import.meta !== "undefined" &&
      // @ts-ignore
      import.meta.env?.[key]) ??
    ""
  );
}

function getGitHubToken(): string {
  if (typeof window === "undefined") return "";
  return (
    sessionStorage.getItem(TOKEN_KEY) ||
    localStorage.getItem(TOKEN_KEY) ||
    ""
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type Step = "upload" | "map" | "preview" | "importing" | "done";

interface CsvImporterScreenProps {
  opts: CsvImporterPluginOptions;
}

export function CsvImporterScreen({ opts }: CsvImporterScreenProps) {
  const [step, setStep]               = useState<Step>("upload");
  const [headers, setHeaders]         = useState<string[]>([]);
  const [rows, setRows]               = useState<CsvRow[]>([]);
  const [mappings, setMappings]       = useState<FieldMapping[]>([]);
  const [slugColumn, setSlugColumn]   = useState(opts.slugColumn);
  const [result, setResult]           = useState<BulkImportResult | null>(null);
  const [error, setError]             = useState<string>("");

  // ---- Upload ----
  const onFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setError("");
      const file = e.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const { headers, rows } = parseCsv(text);
        setHeaders(headers);
        setRows(rows);

        // Pre-populate mappings from opts.fieldMappings
        const initial: FieldMapping[] = headers.map((h) => {
          const existing = opts.fieldMappings.find((m) => m.csvColumn === h);
          return { csvColumn: h, tinaField: existing?.tinaField ?? "" };
        });
        setMappings(initial);
        setStep("map");
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : String(err));
      }
    },
    [opts.fieldMappings]
  );

  // ---- Mapping update ----
  const updateMapping = (csvColumn: string, tinaField: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.csvColumn === csvColumn ? { ...m, tinaField } : m))
    );
  };

  // ---- Import ----
  const runImport = async () => {
    setError("");
    const token = getGitHubToken();
    if (!token) {
      setError(
        "No GitHub token found. Please sign in via Auth0 or set GITHUB_PAT in .env.development."
      );
      return;
    }

    const repo   = getEnv("TINA_GITHUB_REPO_FULL_NAME") || "Greater-Fox-Cities-Bowling-Association/static-site";
    const branch = getEnv("TINA_GITHUB_BRANCH") || "main";

    setStep("importing");
    try {
      const res = await bulkImportFromCsv(
        rows,
        { ...opts, slugColumn, fieldMappings: mappings.filter((m) => m.tinaField) },
        { repo, branch, token }
      );
      setResult(res);
      setStep("done");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
      setStep("preview");
    }
  };

  // ---- Render ----
  const inputClass =
    "border border-gray-300 rounded px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-blue-500";
  const btnClass =
    "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded transition-colors disabled:opacity-50";
  const secondaryClass =
    "border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2 rounded transition-colors";

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-1">{opts.label ?? "CSV Importer"}</h2>
      <p className="text-gray-500 text-sm mb-6">
        Import content into <strong>{opts.collection}</strong> from a CSV file.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-4 text-sm">
          {error}
        </div>
      )}

      {/* ---- Step: Upload ---- */}
      {step === "upload" && (
        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-12 cursor-pointer hover:border-blue-400 transition-colors">
          <span className="text-gray-400 text-4xl mb-3">📂</span>
          <span className="font-medium text-gray-700">Click to upload a CSV file</span>
          <span className="text-gray-400 text-sm mt-1">
            Must include a header row.
          </span>
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onFileChange}
          />
        </label>
      )}

      {/* ---- Step: Map ---- */}
      {step === "map" && (
        <div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Slug column (used to generate file names)
            </label>
            <select
              value={slugColumn}
              onChange={(e) => setSlugColumn(e.target.value)}
              className={inputClass}
            >
              {headers.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <h3 className="font-medium text-gray-800 mb-3">
            Map CSV columns → schema fields
          </h3>
          <table className="w-full text-sm mb-6 border border-gray-200 rounded overflow-hidden">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2 font-medium">CSV Column</th>
                <th className="text-left p-2 font-medium">Schema Field</th>
                <th className="text-left p-2 font-medium text-gray-400">
                  Sample Value
                </th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.csvColumn} className="border-t border-gray-100">
                  <td className="p-2 font-mono text-xs text-gray-600">
                    {m.csvColumn}
                  </td>
                  <td className="p-2">
                    <input
                      type="text"
                      value={m.tinaField}
                      placeholder="leave blank to skip"
                      className={inputClass}
                      onChange={(e) => updateMapping(m.csvColumn, e.target.value)}
                    />
                  </td>
                  <td className="p-2 text-gray-400 truncate max-w-xs">
                    {rows[0]?.[m.csvColumn] ?? ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex gap-3">
            <button className={btnClass} onClick={() => setStep("preview")}>
              Preview ({rows.length} rows) →
            </button>
            <button className={secondaryClass} onClick={() => setStep("upload")}>
              ← Upload different file
            </button>
          </div>
        </div>
      )}

      {/* ---- Step: Preview ---- */}
      {step === "preview" && (
        <div>
          <p className="text-sm text-gray-600 mb-4">
            Ready to import <strong>{rows.length}</strong> items into{" "}
            <code>{opts.contentPath}</code> as{" "}
            <code>.{opts.outputFormat}</code> files.
          </p>
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-xs border border-gray-200 rounded overflow-hidden">
              <thead className="bg-gray-50">
                <tr>
                  {headers.slice(0, 6).map((h) => (
                    <th key={h} className="p-2 text-left font-medium">{h}</th>
                  ))}
                  {headers.length > 6 && (
                    <th className="p-2 text-gray-400">+{headers.length - 6} more</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 10).map((row, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    {headers.slice(0, 6).map((h) => (
                      <td key={h} className="p-2 truncate max-w-xs">{row[h]}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length > 10 && (
              <p className="text-xs text-gray-400 mt-1">
                Showing 10 of {rows.length} rows.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button className={btnClass} onClick={runImport}>
              Confirm &amp; Import {rows.length} items
            </button>
            <button className={secondaryClass} onClick={() => setStep("map")}>
              ← Back to mapping
            </button>
          </div>
        </div>
      )}

      {/* ---- Step: Importing ---- */}
      {step === "importing" && (
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <p className="text-gray-600">
            Committing files to GitHub… please wait.
          </p>
        </div>
      )}

      {/* ---- Step: Done ---- */}
      {step === "done" && result && (
        <div>
          <div className="bg-green-50 border border-green-200 text-green-800 rounded p-4 mb-4">
            <p className="font-semibold">Import complete!</p>
            <p className="text-sm mt-1">
              ✅ {result.succeeded.length} files committed successfully.
              {result.failed.length > 0 &&
                ` ❌ ${result.failed.length} failed.`}
            </p>
          </div>

          {result.failed.length > 0 && (
            <div className="mb-4">
              <h4 className="font-medium text-red-700 mb-2">Failures</h4>
              <ul className="text-sm space-y-1">
                {result.failed.map((f) => (
                  <li key={f.slug} className="text-red-600">
                    <code>{f.slug}</code>: {f.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button
            className={secondaryClass}
            onClick={() => {
              setStep("upload");
              setResult(null);
              setHeaders([]);
              setRows([]);
            }}
          >
            Import another file
          </button>
        </div>
      )}
    </div>
  );
}
