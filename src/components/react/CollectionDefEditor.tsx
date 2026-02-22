import { useState, useEffect } from "react";
import { fetchCollectionDef, saveCollectionDef } from "../../utils/githubApi";
import type {
  CollectionDef,
  CollectionField,
  CollectionFieldType,
} from "../../types/cms";

interface CollectionDefEditorProps {
  /** ID of the collection definition to edit. Undefined when creating new. */
  defId?: string;
  token: string;
  onSave: () => void;
  onCancel: () => void;
  useGitHubAPI?: boolean;
}

const FIELD_TYPES: CollectionFieldType[] = [
  "string",
  "number",
  "boolean",
  "select",
  "date",
  "array",
  "object",
];

function slugify(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function blankField(): CollectionField {
  return { name: "", label: "", type: "string", required: false };
}

export default function CollectionDefEditor({
  defId,
  token,
  onSave,
  onCancel,
  useGitHubAPI = false,
}: CollectionDefEditorProps) {
  const isNew = !defId;

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [id, setId] = useState(defId ?? "");
  const [idManuallySet, setIdManuallySet] = useState(!isNew);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📁");
  const [displayField, setDisplayField] = useState("");
  const [summaryField, setSummaryField] = useState("");
  const [fields, setFields] = useState<CollectionField[]>([blankField()]);

  useEffect(() => {
    if (!isNew && defId) {
      setLoading(true);
      fetchCollectionDef(defId, token, undefined, undefined, useGitHubAPI)
        .then((def: CollectionDef) => {
          setId(def.id);
          setName(def.name);
          setDescription(def.description ?? "");
          setIcon(def.icon ?? "📁");
          setDisplayField(def.displayField ?? "");
          setSummaryField(def.summaryField ?? "");
          setFields(def.fields.length > 0 ? def.fields : [blankField()]);
        })
        .catch((err: Error) => setSaveError(`Failed to load: ${err.message}`))
        .finally(() => setLoading(false));
    }
  }, [defId, token, useGitHubAPI]);

  const handleNameChange = (v: string) => {
    setName(v);
    if (!idManuallySet) setId(slugify(v));
  };

  // ── Field helpers ──────────────────────────────────────────────────────────
  const updateField = (index: number, patch: Partial<CollectionField>) => {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );
  };

  const addField = () => setFields((prev) => [...prev, blankField()]);

  const removeField = (index: number) =>
    setFields((prev) => prev.filter((_, i) => i !== index));

  const moveField = (index: number, dir: -1 | 1) => {
    const next = [...fields];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    const tmp = next[index]!;
    next[index] = next[swap]!;
    next[swap] = tmp;
    setFields(next);
  };

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveError(null);
    setSaveSuccess(false);

    if (!name.trim()) {
      setSaveError("Collection name is required.");
      return;
    }
    if (!id.trim()) {
      setSaveError("Collection ID is required.");
      return;
    }

    const invalidFields = fields.filter(
      (f) => !f.name.trim() || !f.label.trim(),
    );
    if (invalidFields.length > 0) {
      setSaveError("All fields must have a name and label.");
      return;
    }

    const def: CollectionDef = {
      id: id.trim(),
      name: name.trim(),
      fields,
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(icon.trim() ? { icon: icon.trim() } : {}),
      ...(displayField.trim() ? { displayField: displayField.trim() } : {}),
      ...(summaryField.trim() ? { summaryField: summaryField.trim() } : {}),
      updatedAt: new Date().toISOString().split("T")[0] ?? "",
    };

    setSaving(true);
    try {
      const result = await saveCollectionDef(
        def,
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
      setSaveError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-secondary">
          Loading collection definition...
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
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
            <h2 className="text-2xl font-bold text-text">
              {isNew ? "New Collection Type" : `Edit: ${name}`}
            </h2>
            <p className="text-sm text-text-secondary">
              Define the fields that items in this collection will have.
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
            disabled={saving}
            className="px-6 py-2 bg-primary text-background rounded-lg hover:bg-accent font-medium disabled:opacity-50"
          >
            {saving
              ? "Saving…"
              : saveSuccess
                ? "✓ Saved!"
                : isNew
                  ? "Create Collection"
                  : "Save Changes"}
          </button>
        </div>
      </div>

      {/* Basic info */}
      <div className="bg-background border border-text/10 rounded-lg p-6 mb-4 space-y-4">
        <h3 className="font-semibold text-text mb-2">Collection Info</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Movies"
              className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              ID <span className="text-red-500">*</span>
              <span className="text-xs font-normal text-text-secondary ml-1">
                (folder name in src/content/)
              </span>
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => {
                setId(e.target.value);
                setIdManuallySet(true);
              }}
              disabled={!isNew}
              placeholder="e.g. movies"
              className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm font-mono disabled:opacity-60 disabled:bg-text/5"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text mb-1">
            Description
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description shown in the admin"
            className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Icon (emoji)
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="📁"
              className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Display Field
              <span className="text-xs font-normal text-text-secondary ml-1">
                (title in lists)
              </span>
            </label>
            <select
              value={displayField}
              onChange={(e) => setDisplayField(e.target.value)}
              className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-background"
            >
              <option value="">(auto)</option>
              {fields
                .filter((f) => f.name)
                .map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.label || f.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Summary Field
              <span className="text-xs font-normal text-text-secondary ml-1">
                (description in lists)
              </span>
            </label>
            <select
              value={summaryField}
              onChange={(e) => setSummaryField(e.target.value)}
              className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm bg-background"
            >
              <option value="">(auto)</option>
              {fields
                .filter((f) => f.name)
                .map((f) => (
                  <option key={f.name} value={f.name}>
                    {f.label || f.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Fields builder */}
      <div className="bg-background border border-text/10 rounded-lg p-6 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-text">Fields</h3>
          <button
            onClick={addField}
            className="px-3 py-1.5 text-sm bg-primary text-background rounded-lg hover:bg-accent"
          >
            + Add Field
          </button>
        </div>

        {fields.length === 0 && (
          <p className="text-text-secondary text-sm text-center py-4">
            No fields yet. Add a field to define the structure of items in this
            collection.
          </p>
        )}

        <div className="space-y-3">
          {fields.map((field, index) => (
            <div
              key={index}
              className="border border-text/10 rounded-lg p-4 bg-background/50"
            >
              <div className="grid grid-cols-12 gap-3 items-start">
                {/* Name */}
                <div className="col-span-3">
                  {index === 0 && (
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Field Name (key)
                    </label>
                  )}
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) =>
                      updateField(index, { name: slugify(e.target.value) })
                    }
                    placeholder="fieldName"
                    className="w-full px-2 py-1.5 border border-text/20 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {/* Label */}
                <div className="col-span-3">
                  {index === 0 && (
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Display Label
                    </label>
                  )}
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) =>
                      updateField(index, { label: e.target.value })
                    }
                    placeholder="Field Label"
                    className="w-full px-2 py-1.5 border border-text/20 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                {/* Type */}
                <div className="col-span-2">
                  {index === 0 && (
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Type
                    </label>
                  )}
                  <select
                    value={field.type}
                    onChange={(e) =>
                      updateField(index, {
                        type: e.target.value as CollectionFieldType,
                      })
                    }
                    className="w-full px-2 py-1.5 border border-text/20 rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                {/* Required */}
                <div className="col-span-1 flex flex-col items-center">
                  {index === 0 && (
                    <label className="block text-xs font-medium text-text-secondary mb-1">
                      Req.
                    </label>
                  )}
                  <input
                    type="checkbox"
                    checked={!!field.required}
                    onChange={(e) =>
                      updateField(index, { required: e.target.checked })
                    }
                    className="mt-2 h-4 w-4 text-primary border-text/30 rounded"
                  />
                </div>
                {/* Actions */}
                <div className="col-span-3 flex gap-1 items-center justify-end">
                  {index === 0 && <div className="h-5 mb-1" />}
                  <button
                    onClick={() => moveField(index, -1)}
                    disabled={index === 0}
                    className="p-1 text-text-secondary hover:text-text disabled:opacity-30"
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveField(index, 1)}
                    disabled={index === fields.length - 1}
                    className="p-1 text-text-secondary hover:text-text disabled:opacity-30"
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeField(index)}
                    className="p-1 text-red-500 hover:text-red-700"
                    title="Remove field"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Select options (shown only for select type) */}
              {field.type === "select" && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={(field.options ?? []).join(", ")}
                    onChange={(e) =>
                      updateField(index, {
                        options: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="option1, option2, option3"
                    className="w-full px-2 py-1.5 border border-text/20 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              )}

              {/* Description */}
              <div className="mt-2">
                <input
                  type="text"
                  value={field.description ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val) {
                      updateField(index, { description: val });
                    } else {
                      setFields((prev) =>
                        prev.map((f, i) => {
                          if (i !== index) return f;
                          // eslint-disable-next-line @typescript-eslint/no-unused-vars
                          const { description: _d, ...rest } = f;
                          return rest as CollectionField;
                        }),
                      );
                    }
                  }}
                  placeholder="Help text (optional)"
                  className="w-full px-2 py-1.5 border border-text/20 rounded-md text-xs text-text-secondary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {saveError && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <p className="text-red-700 text-sm">{saveError}</p>
        </div>
      )}
      {saveSuccess && (
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-4">
          <p className="text-green-700 text-sm">
            ✓ Collection definition saved!
          </p>
        </div>
      )}
    </div>
  );
}
