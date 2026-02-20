import { useState, useEffect } from "react";
import type { CompositeComponent, PrimitiveComponent, ComponentField, CompositeComponentInstance } from "../../types/cms";
import { fetchPrimitiveComponents, fetchCompositeComponents, saveComponent } from "../../utils/githubApi";

interface CompositeComponentEditorProps {
  componentId?: string;
  token: string;
  onSave: () => void;
  onCancel: () => void;
  useGitHubAPI: boolean;
}

export default function CompositeComponentEditor({
  componentId,
  token,
  onSave,
  onCancel,
  useGitHubAPI,
}: CompositeComponentEditorProps) {
  const [loading, setLoading] = useState(!!componentId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [primitives, setPrimitives] = useState<PrimitiveComponent[]>([]);
  const [showPrimitiveSelector, setShowPrimitiveSelector] = useState(false);

  const [component, setComponent] = useState<CompositeComponent>({
    id: "",
    name: "",
    description: "",
    type: "composite",
    icon: "",
    components: [],
    dataSchema: [],
  });

  useEffect(() => {
    loadPrimitives();
    if (componentId) {
      loadComponent();
    }
  }, [componentId]);

  const loadPrimitives = async () => {
    try {
      const primitivesData = await fetchPrimitiveComponents(token, undefined, undefined, useGitHubAPI);
      setPrimitives(primitivesData);
    } catch (err) {
      console.error("Error loading primitives:", err);
    }
  };

  const loadComponent = async () => {
    if (!componentId) return;

    setLoading(true);
    setError(null);
    try {
      const components = await fetchCompositeComponents(token, undefined, undefined, useGitHubAPI);
      const found = components.find(c => c.id === componentId);
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

  const handleAddPrimitive = (primitiveId: string) => {
    const primitive = primitives.find(p => p.id === primitiveId);
    if (!primitive) return;

    const newInstance: CompositeComponentInstance = {
      id: `${primitiveId}-${Date.now()}`,
      primitive: primitiveId,
      props: {},
    };

    setComponent({
      ...component,
      components: [...component.components, newInstance],
    });
    setShowPrimitiveSelector(false);
  };

  const handleRemoveComponent = (instanceId: string) => {
    setComponent({
      ...component,
      components: component.components.filter(c => c.id !== instanceId),
    });
  };

  const handleUpdateComponentProp = (instanceId: string, propName: string, value: any) => {
    setComponent({
      ...component,
      components: component.components.map(c =>
        c.id === instanceId
          ? { ...c, props: { ...c.props, [propName]: value } }
          : c
      ),
    });
  };

  const handleMoveComponent = (index: number, direction: 'up' | 'down') => {
    const newComponents = [...component.components];
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex < 0 || newIndex >= newComponents.length) return;
    
    const temp = newComponents[index]!;
    newComponents[index] = newComponents[newIndex]!;
    newComponents[newIndex] = temp;
    setComponent({ ...component, components: newComponents });
  };

  const handleAddDataField = () => {
    setComponent({
      ...component,
      dataSchema: [
        ...component.dataSchema,
        {
          name: "",
          label: "",
          type: "string",
          required: false,
        },
      ],
    });
  };

  const handleRemoveDataField = (index: number) => {
    setComponent({
      ...component,
      dataSchema: component.dataSchema.filter((_, i) => i !== index),
    });
  };

  const handleUpdateDataField = (index: number, field: Partial<ComponentField>) => {
    const newFields = [...component.dataSchema];
    newFields[index] = { ...newFields[index], ...field } as ComponentField;
    setComponent({ ...component, dataSchema: newFields });
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

    if (!/^[a-z0-9-]+$/.test(component.id)) {
      alert("Component ID must contain only lowercase letters, numbers, and hyphens");
      return;
    }

    if (component.components.length === 0) {
      alert("Add at least one primitive component");
      return;
    }

    if (component.dataSchema.length === 0) {
      alert("Define at least one data field");
      return;
    }

    for (const field of component.dataSchema) {
      if (!field.name.trim() || !field.label.trim()) {
        alert("All data fields must have a name and label");
        return;
      }
    }

    setSaving(true);
    setError(null);

    try {
      const result = await saveComponent(component, token, undefined, undefined, useGitHubAPI);
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
          {componentId ? `Edit Component: ${componentId}` : "Create New Component"}
        </h2>
        <p className="text-sm text-gray-600 mt-1">
          Build a reusable component by combining primitives
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
              onChange={(e) => setComponent({ ...component, id: e.target.value.toLowerCase() })}
              disabled={!!componentId}
              placeholder="e.g., tournament-card"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Component Name *
            </label>
            <input
              type="text"
              value={component.name}
              onChange={(e) => setComponent({ ...component, name: e.target.value })}
              placeholder="e.g., Tournament Card"
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
            onChange={(e) => setComponent({ ...component, description: e.target.value })}
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
            onChange={(e) => setComponent({ ...component, icon: e.target.value })}
            placeholder="e.g., 🏆, 🎳, 📍"
            maxLength={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Data Schema */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              Data Fields *
              <span className="text-xs text-gray-500 ml-2">
                Define what data this component needs
              </span>
            </label>
            <button
              onClick={handleAddDataField}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
            >
              + Add Field
            </button>
          </div>

          <div className="space-y-2 mb-4">
            {component.dataSchema.map((field, index) => (
              <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  value={field.name}
                  onChange={(e) => handleUpdateDataField(index, { name: e.target.value })}
                  placeholder="Field name (e.g., name, date)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <input
                  type="text"
                  value={field.label}
                  onChange={(e) => handleUpdateDataField(index, { label: e.target.value })}
                  placeholder="Label"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                />
                <select
                  value={field.type}
                  onChange={(e) => handleUpdateDataField(index, { type: e.target.value as any })}
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                >
                  <option value="string">Text</option>
                  <option value="number">Number</option>
                  <option value="boolean">Boolean</option>
                  <option value="array">Array</option>
                  <option value="date">Date</option>
                </select>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => handleUpdateDataField(index, { required: e.target.checked })}
                    className="rounded"
                  />
                  Required
                </label>
                <button
                  onClick={() => handleRemoveDataField(index)}
                  className="text-red-600 hover:text-red-700 text-sm px-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Component Builder */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">
              Build Your Component *
              <span className="text-xs text-gray-500 ml-2">
                Add primitives in order
              </span>
            </label>
            <button
              onClick={() => setShowPrimitiveSelector(!showPrimitiveSelector)}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              + Add Primitive
            </button>
          </div>

          {/* Primitive Selector */}
          {showPrimitiveSelector && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium text-gray-700 mb-2">Select a primitive to add:</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {primitives.map((primitive) => (
                  <button
                    key={primitive.id}
                    onClick={() => handleAddPrimitive(primitive.id)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-left"
                  >
                    <span className="mr-2">{primitive.icon}</span>
                    <span className="text-sm">{primitive.name}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowPrimitiveSelector(false)}
                className="mt-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Component List */}
          <div className="space-y-3">
            {component.components.map((comp, index) => {
              const primitive = primitives.find(p => p.id === comp.primitive);
              return (
                <div key={comp.id} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{primitive?.icon}</span>
                      <span className="font-medium text-gray-900">{primitive?.name}</span>
                      <span className="text-xs text-gray-500">({comp.id})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleMoveComponent(index, 'up')}
                        disabled={index === 0}
                        className="text-gray-600 hover:text-gray-800 disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMoveComponent(index, 'down')}
                        disabled={index === component.components.length - 1}
                        className="text-gray-600 hover:text-gray-800 disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => handleRemoveComponent(comp.id)}
                        className="text-red-600 hover:text-red-700 text-sm ml-2"
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  {/* Props Editor */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-600 mb-2">
                      Props (use {`{{fieldName}}`} to reference data fields):
                    </p>
                    {primitive?.fields.map((field) => (
                      <div key={field.name} className="flex items-center gap-2">
                        <label className="text-xs text-gray-600 w-28">{field.label}:</label>
                        {field.type === 'enum' && field.values ? (
                          <select
                            value={comp.props[field.name] || field.defaultValue || ''}
                            onChange={(e) => handleUpdateComponentProp(comp.id, field.name, e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          >
                            <option value="">Default</option>
                            {field.values.map(v => (
                              <option key={v} value={v}>{v}</option>
                            ))}
                          </select>
                        ) : field.type === 'boolean' ? (
                          <input
                            type="checkbox"
                            checked={comp.props[field.name] || field.defaultValue || false}
                            onChange={(e) => handleUpdateComponentProp(comp.id, field.name, e.target.checked)}
                            className="rounded"
                          />
                        ) : (
                          <input
                            type="text"
                            value={comp.props[field.name] || ''}
                            onChange={(e) => handleUpdateComponentProp(comp.id, field.name, e.target.value)}
                            placeholder={field.defaultValue || `e.g., {{${component.dataSchema[0]?.name || 'fieldName'}}}`}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm font-mono"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {component.components.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                <p className="text-gray-500 mb-2">No primitives added yet</p>
                <button
                  onClick={() => setShowPrimitiveSelector(true)}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Add your first primitive
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
            {saving ? "Saving..." : componentId ? "Update Component" : "Create Component"}
          </button>
        </div>
      </div>
    </div>
  );
}
