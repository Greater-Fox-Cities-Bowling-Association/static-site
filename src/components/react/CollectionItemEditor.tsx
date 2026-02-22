import { useState, useEffect } from "react";
import { fetchCollectionItem, saveCollectionItem } from "../../utils/githubApi";

interface CollectionItemEditorProps {
  collectionName: string;
  /** Undefined when creating a new item */
  filename?: string;
  token: string;
  onSave: () => void;
  onCancel: () => void;
  useGitHubAPI?: boolean;
}

// ── Default templates for new items ────────────────────────────────────────
const TEMPLATES: Record<string, Record<string, unknown>> = {
  centers: {
    name: "",
    address: "",
    city: "",
    state: "WI",
    zip: "",
    phone: "",
    email: "",
    website: "",
    lanes: 0,
    features: [],
  },
  tournaments: {
    name: "",
    date: "",
    location: "",
    description: "",
    entryFee: "",
    prizeFund: "",
    status: "upcoming",
    rules: "",
    contact: { name: "", phone: "", email: "" },
    links: [],
  },
  honors: {
    category: "",
    title: "",
    description: "",
    year: new Date().getFullYear(),
    data: [],
    recipients: [],
  },
  news: {
    title: "",
    date: new Date().toISOString().split("T")[0],
    author: "GFCBA Staff",
    excerpt: "",
    content: "",
    image: "",
    tags: [],
  },
  committees: {
    name: "",
    role: "",
    members: [],
    description: "",
  },
};

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

  const [jsonText, setJsonText] = useState<string>(() => {
    const template = TEMPLATES[collectionName] ?? {};
    return JSON.stringify(template, null, 2);
  });
  const [newFilename, setNewFilename] = useState<string>("");
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!isNew && filename) {
      loadItem(filename);
    }
  }, [filename, collectionName]);

  const loadItem = async (file: string) => {
    setLoading(true);
    try {
      const data = await fetchCollectionItem(
        collectionName,
        file,
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );
      setJsonText(JSON.stringify(data, null, 2));
    } catch (err) {
      setSaveError(
        `Failed to load item: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJsonChange = (value: string) => {
    setJsonText(value);
    setJsonError(null);
    setSaveError(null);
    setSaveSuccess(false);
    // Validate JSON live
    try {
      JSON.parse(value);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
    }
  };

  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);

    // Validate JSON
    let parsedData: unknown;
    try {
      parsedData = JSON.parse(jsonText);
    } catch (e) {
      setJsonError(e instanceof Error ? e.message : "Invalid JSON");
      return;
    }

    // Determine final filename
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

  const collectionIcon: Record<string, string> = {
    centers: "🎳",
    tournaments: "🏆",
    honors: "🥇",
    news: "📰",
    committees: "👥",
  };

  const icon = collectionIcon[collectionName] ?? "📁";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-secondary">Loading item...</div>
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
              <span className="capitalize">{collectionName}</span>
              <span className="text-text-secondary font-normal text-lg">
                / {isNew ? "New Item" : filename}
              </span>
            </h2>
            <p className="text-sm text-text-secondary">
              {isNew
                ? `Creating a new item in ${collectionName}`
                : `Editing ${filename}`}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
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

      {/* JSON editor */}
      <div className="bg-background border border-text/10 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-text">JSON Content</label>
          {jsonError && (
            <span className="text-xs text-red-600 font-mono">{jsonError}</span>
          )}
          {!jsonError && (
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
        <p className="mt-1 text-xs text-text-secondary">
          Edit the JSON directly. All fields shown in the template are
          supported.
        </p>
      </div>

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
