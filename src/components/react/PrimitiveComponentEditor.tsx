import { useState, useEffect } from "react";
import type {
  PrimitiveComponent,
  ComponentField,
  FieldType,
} from "../../types/cms";
import { fetchPrimitiveComponents, saveComponent } from "../../utils/githubApi";

interface PrimitiveComponentEditorProps {
  componentId?: string;
  token: string;
  onSave: () => void;
  onCancel: () => void;
  useGitHubAPI: boolean;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "string", label: "Text (string)" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "True/False (boolean)" },
  { value: "array", label: "List (array)" },
  { value: "object", label: "Object" },
  { value: "enum", label: "Selection (enum)" },
  { value: "date", label: "Date" },
];

export default function PrimitiveComponentEditor({
  componentId,
  token,
  onSave,
  onCancel,
  useGitHubAPI,
}: PrimitiveComponentEditorProps) {
  const [loading, setLoading] = useState(!!componentId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [component, setComponent] = useState<PrimitiveComponent>({
    id: "",
    name: "",
    description: "",
    type: "primitive",
    icon: "",
    fields: [],
  });

  useEffect(() => {
    if (componentId) {
      loadComponent();
    }
  }, [componentId]);

  const loadComponent = async () => {
    if (!componentId) return;

    setLoading(true);
    setError(null);
    try {
      const components = await fetchPrimitiveComponents(
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );
      const found = components.find((c) => c.id === componentId);
      if (found) {
        setComponent(found);
      } else {
        throw new Error("Component not found");
      }
    } catch (err) {
      console.error("Error loading component:", err);
      setError(err instanceof Error ? err.message : "Failed to load component");
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    setComponent({
      ...component,
      fields: [
        ...component.fields,
        {
          name: "",
          label: "",
          type: "string",
          required: false,
          description: "",
        },
      ],
    });
  };

  const handleRemoveField = (index: number) => {
    setComponent({
      ...component,
      fields: component.fields.filter((_, i) => i !== index),
    });
  };

  const handleFieldChange = (index: number, field: Partial<ComponentField>) => {
    const newFields = [...component.fields];
    newFields[index] = { ...newFields[index], ...field } as ComponentField;
    setComponent({ ...component, fields: newFields });
  };

  const handleSave = async () => {
    // Validation
    if (!component.id.trim()) {
      alert("Component ID is required");
      return;
    }

    if (!component.name.trim()) {
      alert("Component name is required");
      return;
    }

    // Validate ID format (lowercase, hyphens only)
    if (!/^[a-z0-9-]+$/.test(component.id)) {
      alert(
        "Component ID must contain only lowercase letters, numbers, and hyphens",
      );
      return;
    }

    if (component.fields.length === 0) {
      alert("At least one field is required");
      return;
    }

    for (const field of component.fields) {
      if (!field.name.trim()) {
        alert("All fields must have a name");
        return;
      }
      if (!field.label.trim()) {
        alert("All fields must have a label");
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const result = await saveComponent(
        component,
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );
      if (!result.success) {
        throw new Error(result.error || "Failed to save component");
      }
      setSaving(false);
      onSave();
    } catch (err) {
      console.error("Error saving component:", err);
      setError(err instanceof Error ? err.message : "Failed to save component");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading component...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900">
          {componentId
            ? `Edit Primitive: ${componentId}`
            : "Create New Primitive Component"}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Define a basic building block for your pages
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Component ID *
            </label>
            <input
              type="text"
              value={component.id}
              onChange={(e) =>
                setComponent({ ...component, id: e.target.value.toLowerCase() })
              }
              disabled={!!componentId}
              placeholder="e.g., text, image, button"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
            <p className="text-xs text-gray-500 mt-1">
              Lowercase letters, numbers, and hyphens only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Component Name *
            </label>
            <input
              type="text"
              value={component.name}
              onChange={(e) =>
                setComponent({ ...component, name: e.target.value })
              }
              placeholder="e.g., Text, Image, Button"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={component.description}
            onChange={(e) =>
              setComponent({ ...component, description: e.target.value })
            }
            placeholder="Brief description of this component"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Icon (Emoji)
          </label>
          <input
            type="text"
            value={component.icon}
            onChange={(e) =>
              setComponent({ ...component, icon: e.target.value })
            }
            placeholder="e.g., 📝, 🖼️, 🔘"
            maxLength={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Fields */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              Component Fields *
            </label>
            <button
              onClick={handleAddField}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Field
            </button>
          </div>

          <div className="space-y-3">
            {component.fields.map((field, index) => (
              <div
                key={index}
                className="p-4 border border-gray-200 rounded-lg"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
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
                      placeholder="e.g., content, src"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Label *
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) =>
                        handleFieldChange(index, { label: e.target.value })
                      }
                      placeholder="e.g., Content, Image URL"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Type *
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) =>
                        handleFieldChange(index, {
                          type: e.target.value as FieldType,
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

            {component.fields.length === 0 && (
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
              : componentId
                ? "Update Component"
                : "Create Component"}
          </button>
        </div>
      </div>
    </div>
  );
}
