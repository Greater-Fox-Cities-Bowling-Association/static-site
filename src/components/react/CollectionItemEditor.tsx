import { useState, useEffect } from "react";
import {
  fetchCollectionItem,
  saveCollectionItem,
  fetchCollectionDef,
} from "../../utils/githubApi";
import type { CollectionDef, CollectionField } from "../../types/cms";

interface CollectionItemEditorProps {
  collectionName: string;
  /** Undefined when creating a new item */
  filename?: string;
  token: string;
  onSave: () => void;
  onCancel: () => void;
  useGitHubAPI?: boolean;
}

// ── Build a blank item object from a collection definition's fields ───────────
function buildDefaultFromDef(
  fields: CollectionField[],
): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const field of fields) {
    switch (field.type) {
      case "number":
        obj[field.name] = 0;
        break;
      case "boolean":
        obj[field.name] = false;
        break;
      case "array":
        obj[field.name] = [];
        break;
      case "object":
        obj[field.name] = {};
        break;
      case "select":
        obj[field.name] = field.options?.[0] ?? "";
        break;
      default:
        obj[field.name] = "";
        break;
    }
  }
  return obj;
}

function sanitizeFilename(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CollectionItemEditor({
  collectionName,
  filename,
  token,
  onSave,
  onCancel,
  useGitHubAPI = false,
}: CollectionItemEditorProps) {
  const isNew = !filename;

  const [def, setDef] = useState<CollectionDef | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [jsonText, setJsonText] = useState<string>("{}");
  const [rawMode, setRawMode] = useState<boolean>(false);
  const [newFilename, setNewFilename] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load collection definition and (if editing) the existing item
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        // Load the collection definition
        let loadedDef: CollectionDef | null = null;
        try {
          loadedDef = await fetchCollectionDef(
            collectionName,
            token,
            undefined,
            undefined,
            useGitHubAPI,
          );
          setDef(loadedDef);
        } catch {
          // No definition found — fall back to raw JSON mode
          setRawMode(true);
        }

        if (!isNew && filename) {
          // Load the existing item
          const data = await fetchCollectionItem(
            collectionName,
            filename,
            token,
            undefined,
            undefined,
            useGitHubAPI,
          );
          setFormData(data);
          setJsonText(JSON.stringify(data, null, 2));
        } else if (loadedDef) {
          // New item — seed from definition
          const blank = buildDefaultFromDef(loadedDef.fields);
          setFormData(blank);
          setJsonText(JSON.stringify(blank, null, 2));
        }
      } catch (err) {
        setSaveError(
          `Failed to load: ${err instanceof Error ? err.message : "Unknown error"}`,
        );
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [filename, collectionName, token, useGitHubAPI]);

  // Keep JSON text in sync when formData changes (in form mode)
  const updateField = (name: string, value: unknown) => {
    const next = { ...formData, [name]: value };
    setFormData(next);
    setJsonText(JSON.stringify(next, null, 2));
    setJsonError(null);
  };

  const handleJsonChange = (value: string) => {
    setJsonText(value);
    setJsonError(null);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      setFormData(JSON.parse(value));
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);

    let parsedData: unknown;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
      return;
    }

    let finalFilename: string;
    if (isNew) {
      const raw = newFilename.trim();
      if (!raw) {
        setSaveError("Please enter a filename for this item.");
        return;
      }
      finalFilename = raw.endsWith(".json")
        ? raw
        : `${sanitizeFilename(raw)}.json`;
    } else {
      finalFilename = filename!;
    }

    setSaving(true);
    try {
      const result = await saveCollectionItem(
        collectionName,
        finalFilename,
        parsedData,
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );
      if (!result.success) {
        setSaveError(result.error ?? "Save failed");
      } else {
        setSaveSuccess(true);
        setTimeout(() => onSave(), 800);
      }
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Unknown error saving item",
      );
    } finally {
      setSaving(false);
    }
  };

  const icon = def?.icon ?? "📁";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="text-text-secondary hover:text-text transition-colors"
          >
            ← Back
          </button>
          <div>
            <h2 className="text-2xl font-bold text-text flex items-center gap-2">
              <span>{icon}</span>
              <span>{def?.name ?? collectionName}</span>
              <span className="text-text-secondary font-normal text-lg">
                / {isNew ? "New Item" : filename}
              </span>
            </h2>
            <p className="text-sm text-text-secondary">
              {isNew
                ? `Creating a new item in ${def?.name ?? collectionName}`
                : `Editing ${filename}`}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setRawMode(!rawMode)}
            className="px-3 py-1.5 text-sm text-text-secondary border border-text/20 rounded-lg hover:bg-text/5"
            title={rawMode ? "Switch to form view" : "Edit raw JSON"}
          >
            {rawMode ? "Form View" : "Raw JSON"}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-text border border-text/20 rounded-lg hover:bg-text/5"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !!jsonError}
            className="px-6 py-2 bg-primary text-background rounded-lg hover:bg-accent font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving
              ? "Saving…"
              : saveSuccess
                ? "✓ Saved!"
                : isNew
                  ? "Create Item"
                  : "Save Changes"}
          </button>
        </div>
      </div>

      {/* New item filename */}
      {isNew && (
        <div className="bg-background border border-text/10 rounded-lg p-4 mb-4">
          <label className="block text-sm font-medium text-text mb-2">
            Filename <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
              placeholder="e.g. my-new-item"
              className="flex-1 px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
            />
            <span className="text-text-secondary text-sm">.json</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Will be saved as{" "}
            <code className="bg-text/10 px-1 rounded">
              src/content/{collectionName}/
              {newFilename
                ? sanitizeFilename(newFilename) || newFilename
                : "your-filename"}
              .json
            </code>
          </p>
        </div>
      )}

      {/* Form fields (when definition is available and not in raw mode) */}
      {!rawMode && def && def.fields.length > 0 && (
        <div className="bg-background border border-text/10 rounded-lg p-6 space-y-5">
          {def.fields.map((field) => (
            <div key={field.name}>
              <label className="block text-sm font-medium text-text mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {field.description && (
                <p className="text-xs text-text-secondary mb-1">
                  {field.description}
                </p>
              )}

              {field.type === "boolean" && (
                <input
                  type="checkbox"
                  checked={!!formData[field.name]}
                  onChange={(e) => updateField(field.name, e.target.checked)}
                  className="h-4 w-4 text-primary border-text/30 rounded"
                />
              )}

              {field.type === "number" && (
                <input
                  type="number"
                  value={(formData[field.name] as number) ?? 0}
                  onChange={(e) =>
                    updateField(
                      field.name,
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              )}

              {field.type === "date" && (
                <input
                  type="date"
                  value={(formData[field.name] as string) ?? ""}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              )}

              {field.type === "select" && field.options && (
                <select
                  value={(formData[field.name] as string) ?? ""}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-background"
                >
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              )}

              {field.type === "string" && (
                <textarea
                  rows={
                    field.name === "content" ||
                    field.name === "description" ||
                    field.name === "excerpt"
                      ? 4
                      : 1
                  }
                  value={(formData[field.name] as string) ?? ""}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-y"
                />
              )}

              {(field.type === "array" || field.type === "object") && (
                <div>
                  <textarea
                    rows={4}
                    value={JSON.stringify(
                      formData[field.name] ??
                        (field.type === "array" ? [] : {}),
                      null,
                      2,
                    )}
                    onChange={(e) => {
                      try {
                        updateField(field.name, JSON.parse(e.target.value));
                        setJsonError(null);
                      } catch {
                        // Keep raw text in sync through rawMode fallback
                      }
                    }}
                    spellCheck={false}
                    className="w-full font-mono text-sm px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-y"
                  />
                  <p className="mt-1 text-xs text-text-secondary">
                    Edit as JSON{" "}
                    {field.arrayFields
                      ? `— each item: ${JSON.stringify(Object.fromEntries(field.arrayFields.map((f) => [f.name, f.type])))}`
                      : ""}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Raw JSON editor (raw mode or no definition) */}
      {(rawMode || !def) && (
        <div className="bg-background border border-text/10 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-text">
              JSON Content
            </label>
            {jsonError ? (
              <span className="text-xs text-red-600 font-mono">
                {jsonError}
              </span>
            ) : (
              <span className="text-xs text-green-600">✓ Valid JSON</span>
            )}
          </div>
          <textarea
            value={jsonText}
            onChange={(e) => handleJsonChange(e.target.value)}
            rows={30}
            spellCheck={false}
            className={`w-full font-mono text-sm px-3 py-2 border rounded-md focus:outline-none focus:ring-2 resize-y bg-background text-text ${
              jsonError
                ? "border-red-400 focus:ring-red-300"
                : "border-text/20 focus:ring-primary"
            }`}
          />
          {!def && (
            <p className="mt-1 text-xs text-text-secondary">
              No collection definition found for{" "}
              <code className="bg-text/10 px-1 rounded">{collectionName}</code>.
              Edit raw JSON or create a collection definition to get a guided
              form.
            </p>
          )}
        </div>
      )}

      {/* Save feedback */}
      {saveError && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-700 text-sm">{saveError}</p>
        </div>
      )}
      {saveSuccess && (
        <div className="mt-4 bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <p className="text-green-700 text-sm">✓ Saved successfully!</p>
        </div>
      )}
    </div>
  );
}
