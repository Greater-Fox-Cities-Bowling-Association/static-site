import { useState, useEffect } from "react";
import { getCollection, saveCollection } from "../../utils/githubApi";

interface ComponentSchemaEditorProps {
  componentName?: string;
  token: string;
  onSave: () => void;
  onCancel: () => void;
  useGitHubAPI: boolean;
}

interface Field {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object" | "date";
  required: boolean;
  description?: string;
}

interface ComponentSchema {
  name: string;
  description?: string;
  fields: Field[];
}

const FIELD_TYPES = [
  { value: "string", label: "Text (string)" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "True/False (boolean)" },
  { value: "array", label: "List (array)" },
  { value: "object", label: "Object" },
  { value: "date", label: "Date" },
] as const;

export default function ComponentSchemaEditor({
  componentName,
  token,
  onSave,
  onCancel,
  useGitHubAPI,
}: ComponentSchemaEditorProps) {
  const [loading, setLoading] = useState(!!componentName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [schema, setSchema] = useState<ComponentSchema>({
    name: "",
    description: "",
    fields: [],
  });

  useEffect(() => {
    if (componentName) {
      loadSchema();
    }
  }, [componentName]);

  const loadSchema = async () => {
    if (!componentName) return;

    setLoading(true);
    setError(null);
    try {
      const data = await getCollection(componentName, token, useGitHubAPI);
      setSchema(data);
    } catch (err) {
      console.error("Error loading component schema:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load component schema",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    setSchema({
      ...schema,
      fields: [
        ...schema.fields,
        { name: "", type: "string", required: false, description: "" },
      ],
    });
  };

  const handleRemoveField = (index: number) => {
    setSchema({
      ...schema,
      fields: schema.fields.filter((_, i) => i !== index),
    });
  };

  const handleFieldChange = (index: number, field: Partial<Field>) => {
    const newFields = [...schema.fields];
    newFields[index] = { ...newFields[index], ...field } as Field;
    setSchema({ ...schema, fields: newFields });
  };

  const handleSave = async () => {
    // Validation
    if (!schema.name.trim()) {
      alert("Component schema name is required");
      return;
    }

    if (schema.fields.length === 0) {
      alert("At least one field is required");
      return;
    }

    for (const field of schema.fields) {
      if (!field.name.trim()) {
        alert("All fields must have a name");
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      await saveCollection(schema, token, useGitHubAPI);
      onSave();
    } catch (err) {
      console.error("Error saving component schema:", err);
      setError(
        err instanceof Error ? err.message : "Failed to save component schema",
      );
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">
            Loading component schema...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {componentName
            ? `Edit Component Schema: ${componentName}`
            : "Create New Component Schema"}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Define the schema for your component assembled from primitive types
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Info */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Schema Name *
          </label>
          <input
            type="text"
            value={schema.name}
            onChange={(e) => setSchema({ ...schema, name: e.target.value })}
            disabled={!!componentName}
            placeholder="e.g., honors, tournaments, centers"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            Use lowercase letters, numbers, and hyphens only
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={schema.description}
            onChange={(e) =>
              setSchema({ ...schema, description: e.target.value })
            }
            placeholder="Brief description of this component schema"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Fields */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              Schema Fields (Primitive Components) *
            </label>
            <button
              onClick={handleAddField}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Field
            </button>
          </div>

          <div className="space-y-3">
            {schema.fields.map((field, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Field Name *
                    </label>
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) =>
                        handleFieldChange(index, { name: e.target.value })
                      }
                      placeholder="e.g., title, date, score"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Primitive Type *
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) =>
                        handleFieldChange(index, {
                          type: e.target.value as Field["type"],
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      {FIELD_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={field.description || ""}
                    onChange={(e) =>
                      handleFieldChange(index, { description: e.target.value })
                    }
                    placeholder="Optional field description"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) =>
                        handleFieldChange(index, { required: e.target.checked })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">
                      Required field
                    </span>
                  </label>

                  <button
                    onClick={() => handleRemoveField(index)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}

            {schema.fields.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 mb-2">No fields added yet</p>
                <button
                  onClick={handleAddField}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add Your First Field
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving
              ? "Saving..."
              : componentName
                ? "Update Schema"
                : "Create Schema"}
          </button>
        </div>
      </div>

      <div className="mt-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start gap-3">
          <div className="text-xl">⚠️</div>
          <div>
            <h4 className="font-semibold text-amber-900 mb-1">Important</h4>
            <p className="text-sm text-amber-800">
              Changing the component schema may affect existing content items.
              Make sure to update your content items to match the new schema
              structure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
