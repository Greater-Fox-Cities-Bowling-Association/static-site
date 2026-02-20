import { useState, useEffect } from "react";
import type {
  CompositeComponent,
  PrimitiveComponent,
  ComponentField,
  CompositeComponentInstance,
} from "../../types/cms";
import {
  fetchPrimitiveComponents,
  fetchCompositeComponents,
  saveComponent,
} from "../../utils/githubApi";

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
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(
    null,
  );

  const [component, setComponent] = useState<CompositeComponent>({
    id: "",
    name: "",
    description: "",
    type: "composite",
    icon: "",
    minColumns: 4,
    defaultColumns: 6,
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
      const primitivesData = await fetchPrimitiveComponents(
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );
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
      const components = await fetchCompositeComponents(
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

  const handleAddPrimitive = (primitiveId: string) => {
    const primitive = primitives.find((p) => p.id === primitiveId);
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
      components: component.components.filter((c) => c.id !== instanceId),
    });
  };

  const handleUpdateComponentProp = (
    instanceId: string,
    propName: string,
    value: any,
  ) => {
    setComponent({
      ...component,
      components: component.components.map((c) =>
        c.id === instanceId
          ? { ...c, props: { ...c.props, [propName]: value } }
          : c,
      ),
    });
  };

  const handleMoveComponent = (index: number, direction: "up" | "down") => {
    const newComponents = [...component.components];
    const newIndex = direction === "up" ? index - 1 : index + 1;

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

  const handleUpdateDataField = (
    index: number,
    field: Partial<ComponentField>,
  ) => {
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
      alert(
        "Component ID must contain only lowercase letters, numbers, and hyphens",
      );
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

  // Generate sample data from schema for preview
  const sampleData: Record<string, any> = {};
  component.dataSchema.forEach((field) => {
    if (field.type === "string") {
      sampleData[field.name] = field.label || field.name;
    } else if (field.type === "number") {
      sampleData[field.name] = 42;
    } else if (field.type === "boolean") {
      sampleData[field.name] = true;
    } else if (field.type === "array") {
      sampleData[field.name] = ["Item 1", "Item 2"];
    } else {
      sampleData[field.name] = field.label || "Sample";
    }
  });

  // Replace template variables in prop values
  const renderPropValue = (value: any): string => {
    if (typeof value !== "string") return value;
    return value.replace(/\{\{(\w+)\}\}/g, (_, fieldName) => {
      return sampleData[fieldName] || `{{${fieldName}}}`;
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            {componentId
              ? `Edit Component: ${componentId}`
              : "Create New Component"}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Build a reusable component by combining primitives
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "Saving..." : componentId ? "Update" : "Create"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Two-Panel Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT PANEL: Builder */}
        <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-16rem)]">
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
                  setComponent({
                    ...component,
                    id: e.target.value.toLowerCase(),
                  })
                }
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
                onChange={(e) =>
                  setComponent({ ...component, name: e.target.value })
                }
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
              placeholder="e.g., 🏆, 🎳, 📍"
              maxLength={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Grid Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Column Size
              <span className="text-xs text-gray-500 ml-2">12-column grid</span>
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Set how wide this component is by default and the minimum it can
              be squeezed to. Pages can override the actual placement.
            </p>
            <div className="space-y-4">
              {(["minColumns", "defaultColumns"] as const).map((key) => {
                const label =
                  key === "minColumns" ? "Minimum width" : "Default width";
                const hint =
                  key === "minColumns"
                    ? "Smallest this component can be — it won't look right below this"
                    : "Suggested width when dropped onto a page";
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-600">
                        {label}
                      </span>
                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded">
                        {component[key]}/12 cols
                        <span className="text-gray-400 ml-1">
                          (~{Math.round((component[key] / 12) * 100)}%)
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-2">{hint}</p>
                    {/* Visual 12-column grid picker */}
                    <div className="flex gap-1">
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(
                        (col) => {
                          const isActive = col <= component[key];
                          const isExact = col === component[key];
                          const isBelowMin =
                            key === "defaultColumns" &&
                            col < component.minColumns;
                          return (
                            <button
                              key={col}
                              type="button"
                              disabled={isBelowMin}
                              onClick={() => {
                                const update: Partial<CompositeComponent> = {
                                  [key]: col,
                                };
                                // If setting minColumns above defaultColumns, raise default too
                                if (
                                  key === "minColumns" &&
                                  col > component.defaultColumns
                                ) {
                                  update.defaultColumns = col;
                                }
                                setComponent({ ...component, ...update });
                              }}
                              title={
                                isBelowMin
                                  ? `Can't go below min (${component.minColumns})`
                                  : `${col} col${col !== 1 ? "s" : ""}`
                              }
                              className={`flex-1 h-6 rounded-sm text-xs font-bold transition-all border ${
                                isBelowMin
                                  ? "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed"
                                  : isExact
                                    ? key === "minColumns"
                                      ? "bg-orange-500 border-orange-600 text-white"
                                      : "bg-blue-600 border-blue-700 text-white"
                                    : isActive
                                      ? key === "minColumns"
                                        ? "bg-orange-200 border-orange-300 text-orange-800"
                                        : "bg-blue-200 border-blue-300 text-blue-800"
                                      : "bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200"
                              }`}
                            >
                              {isExact ? col : ""}
                            </button>
                          );
                        },
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Width comparison bar */}
              <div>
                <p className="text-xs text-gray-500 mb-1">
                  Preview (relative to full page width):
                </p>
                <div className="relative h-5 bg-gray-100 rounded border border-gray-200 overflow-hidden">
                  <div
                    className="absolute top-0 left-0 h-full bg-orange-200 border-r-2 border-orange-400 transition-all"
                    style={{ width: `${(component.minColumns / 12) * 100}%` }}
                    title={`Min: ${component.minColumns} cols`}
                  />
                  <div
                    className="absolute top-0 left-0 h-full bg-blue-300 opacity-60 border-r-2 border-blue-500 transition-all"
                    style={{
                      width: `${(component.defaultColumns / 12) * 100}%`,
                    }}
                    title={`Default: ${component.defaultColumns} cols`}
                  />
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 pointer-events-none">
                    <span className="bg-white/80 px-1 rounded">
                      🟠 min ({component.minColumns}) &nbsp; 🔵 default (
                      {component.defaultColumns})
                    </span>
                  </div>
                </div>
              </div>
            </div>
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
                <div
                  key={index}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                >
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) =>
                      handleUpdateDataField(index, { name: e.target.value })
                    }
                    placeholder="Field name (e.g., name, date)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) =>
                      handleUpdateDataField(index, { label: e.target.value })
                    }
                    placeholder="Label"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                  <select
                    value={field.type}
                    onChange={(e) =>
                      handleUpdateDataField(index, {
                        type: e.target.value as any,
                      })
                    }
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
                      onChange={(e) =>
                        handleUpdateDataField(index, {
                          required: e.target.checked,
                        })
                      }
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
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Select a primitive to add:
                </p>
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
                const primitive = primitives.find(
                  (p) => p.id === comp.primitive,
                );
                return (
                  <div
                    key={comp.id}
                    className="p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{primitive?.icon}</span>
                        <span className="font-medium text-gray-900">
                          {primitive?.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({comp.id})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleMoveComponent(index, "up")}
                          disabled={index === 0}
                          className="text-gray-600 hover:text-gray-800 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMoveComponent(index, "down")}
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
                        <div
                          key={field.name}
                          className="flex items-center gap-2"
                        >
                          <label className="text-xs text-gray-600 w-28">
                            {field.label}:
                          </label>
                          {field.type === "enum" && field.values ? (
                            <select
                              value={
                                comp.props[field.name] ||
                                field.defaultValue ||
                                ""
                              }
                              onChange={(e) =>
                                handleUpdateComponentProp(
                                  comp.id,
                                  field.name,
                                  e.target.value,
                                )
                              }
                              className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="">Default</option>
                              {field.values.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                          ) : field.type === "boolean" ? (
                            <input
                              type="checkbox"
                              checked={
                                comp.props[field.name] ||
                                field.defaultValue ||
                                false
                              }
                              onChange={(e) =>
                                handleUpdateComponentProp(
                                  comp.id,
                                  field.name,
                                  e.target.checked,
                                )
                              }
                              className="rounded"
                            />
                          ) : (
                            <input
                              type="text"
                              value={comp.props[field.name] || ""}
                              onChange={(e) =>
                                handleUpdateComponentProp(
                                  comp.id,
                                  field.name,
                                  e.target.value,
                                )
                              }
                              placeholder={
                                field.defaultValue ||
                                `e.g., {{${component.dataSchema[0]?.name || "fieldName"}}}`
                              }
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
        </div>

        {/* RIGHT PANEL: Visual Preview */}
        <div className="lg:border-l lg:pl-6">
          <div className="sticky top-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>👁️</span>
              Live Preview
            </h3>

            {component.components.length > 0 ? (
              <div className="border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
                {/* Browser chrome mockup */}
                <div className="bg-gray-100 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-2 bg-white rounded px-3 py-0.5 text-xs text-gray-400 border border-gray-300">
                    {component.name || "Component Preview"}
                  </div>
                  <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                    {component.defaultColumns}/12
                  </span>
                </div>
                {/* Column width ruler */}
                <div className="flex bg-gray-50 border-b border-gray-200">
                  {Array.from({ length: 12 }, (_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-1.5 border-r border-gray-300 last:border-r-0 ${
                        i < component.defaultColumns ? "bg-blue-200" : ""
                      } ${i < component.minColumns ? "bg-orange-300" : ""}`}
                    />
                  ))}
                </div>

                {/* Rendered component */}
                <div className="p-6">
                  {component.components.map((comp) => {
                    const primitive = primitives.find(
                      (p) => p.id === comp.primitive,
                    );
                    const isSelected = selectedInstanceId === comp.id;
                    return (
                      <div
                        key={comp.id}
                        onClick={() =>
                          setSelectedInstanceId(isSelected ? null : comp.id)
                        }
                        title={`${primitive?.name} — click to select`}
                        className={`relative cursor-pointer transition-all group ${
                          isSelected
                            ? "outline outline-2 outline-blue-500 outline-offset-2 rounded"
                            : ""
                        }`}
                      >
                        {/* Selection tooltip */}
                        {isSelected && (
                          <span className="absolute -top-5 left-0 text-xs bg-blue-500 text-white px-2 py-0.5 rounded z-10">
                            {primitive?.icon} {primitive?.name}
                          </span>
                        )}
                        {/* Hover ring */}
                        {!isSelected && (
                          <span className="absolute inset-0 rounded group-hover:ring-2 group-hover:ring-blue-300 group-hover:ring-offset-1 pointer-events-none" />
                        )}

                        {/* ── text ── */}
                        {primitive?.id === "text" && (
                          <div
                            style={{
                              textAlign:
                                (comp.props.alignment as any) || "left",
                            }}
                          >
                            {comp.props.heading && (
                              <h3 className="text-xl font-bold mb-1">
                                {renderPropValue(comp.props.heading)}
                              </h3>
                            )}
                            {comp.props.content && (
                              <p className="text-gray-700 leading-relaxed">
                                {renderPropValue(comp.props.content)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* ── image ── */}
                        {primitive?.id === "image" && (
                          <div className="my-2">
                            <div
                              className="bg-gradient-to-br from-gray-200 to-gray-300 rounded flex flex-col items-center justify-center text-gray-500"
                              style={{
                                width: comp.props.width || "100%",
                                height: comp.props.height || "180px",
                              }}
                            >
                              <span className="text-4xl mb-1">🖼️</span>
                              <span className="text-sm">
                                {renderPropValue(comp.props.alt || "Image")}
                              </span>
                            </div>
                            {comp.props.caption && (
                              <p className="text-sm text-gray-500 text-center mt-1 italic">
                                {renderPropValue(comp.props.caption)}
                              </p>
                            )}
                          </div>
                        )}

                        {/* ── button ── */}
                        {primitive?.id === "button" && (
                          <div className="my-2">
                            <span
                              className={`inline-block rounded font-medium cursor-default ${
                                comp.props.style === "secondary"
                                  ? "bg-gray-700 text-white"
                                  : comp.props.style === "outline"
                                    ? "border-2 border-blue-600 text-blue-600"
                                    : comp.props.style === "text"
                                      ? "text-blue-600 underline"
                                      : "bg-blue-600 text-white"
                              } ${
                                comp.props.size === "small"
                                  ? "text-sm px-3 py-1"
                                  : comp.props.size === "large"
                                    ? "text-lg px-8 py-3"
                                    : "px-5 py-2"
                              }`}
                            >
                              {renderPropValue(comp.props.text || "Button")}
                            </span>
                          </div>
                        )}

                        {/* ── list ── */}
                        {primitive?.id === "list" && (
                          <div className="my-2">
                            {comp.props.heading && (
                              <h4 className="font-semibold mb-1">
                                {renderPropValue(comp.props.heading)}
                              </h4>
                            )}
                            {comp.props.ordered ? (
                              <ol className="list-decimal list-inside text-gray-700 space-y-1">
                                {(
                                  sampleData[
                                    comp.props.items?.replace?.(
                                      /\{\{(\w+)\}\}/,
                                      "$1",
                                    )
                                  ] || ["Item 1", "Item 2", "Item 3"]
                                ).map((item: string, i: number) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ol>
                            ) : (
                              <ul className="list-disc list-inside text-gray-700 space-y-1">
                                {(
                                  sampleData[
                                    comp.props.items?.replace?.(
                                      /\{\{(\w+)\}\}/,
                                      "$1",
                                    )
                                  ] || ["Item 1", "Item 2", "Item 3"]
                                ).map((item: string, i: number) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        {/* ── table ── */}
                        {primitive?.id === "table" && (
                          <div className="my-2 overflow-x-auto">
                            {comp.props.heading && (
                              <h4 className="font-semibold mb-1">
                                {renderPropValue(comp.props.heading)}
                              </h4>
                            )}
                            <table
                              className={`w-full text-sm ${comp.props.bordered ? "border border-gray-300" : ""}`}
                            >
                              <thead>
                                <tr className="bg-gray-100">
                                  {(
                                    sampleData[
                                      comp.props.headers?.replace?.(
                                        /\{\{(\w+)\}\}/,
                                        "$1",
                                      )
                                    ] || ["Column 1", "Column 2", "Column 3"]
                                  ).map((h: string, i: number) => (
                                    <th
                                      key={i}
                                      className="px-3 py-2 text-left border-b border-gray-300"
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                <tr
                                  className={
                                    comp.props.striped ? "bg-white" : ""
                                  }
                                >
                                  <td className="px-3 py-2 border-b border-gray-200">
                                    Sample
                                  </td>
                                  <td className="px-3 py-2 border-b border-gray-200">
                                    Data
                                  </td>
                                  <td className="px-3 py-2 border-b border-gray-200">
                                    Row
                                  </td>
                                </tr>
                                <tr
                                  className={
                                    comp.props.striped ? "bg-gray-50" : ""
                                  }
                                >
                                  <td className="px-3 py-2">Another</td>
                                  <td className="px-3 py-2">Sample</td>
                                  <td className="px-3 py-2">Row</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}

                        {/* ── divider ── */}
                        {primitive?.id === "divider" && (
                          <hr
                            className={`border-gray-300 ${
                              comp.props.thickness === "thick"
                                ? "border-t-4"
                                : comp.props.thickness === "medium"
                                  ? "border-t-2"
                                  : "border-t"
                            } ${
                              comp.props.margin === "large"
                                ? "my-8"
                                : comp.props.margin === "small"
                                  ? "my-2"
                                  : "my-4"
                            }`}
                            style={{
                              borderColor: comp.props.color || undefined,
                            }}
                          />
                        )}

                        {/* ── link ── */}
                        {primitive?.id === "link" && (
                          <a
                            className={`text-blue-600 ${comp.props.underline !== false ? "underline" : ""}`}
                          >
                            {renderPropValue(comp.props.text || "Link text")}
                          </a>
                        )}

                        {/* ── spacer ── */}
                        {primitive?.id === "spacer" && (
                          <div
                            className={`${
                              comp.props.size === "small"
                                ? "h-2"
                                : comp.props.size === "large"
                                  ? "h-12"
                                  : comp.props.size === "xlarge"
                                    ? "h-24"
                                    : "h-6"
                            } relative group-hover:bg-blue-50`}
                          />
                        )}

                        {/* ── section ── */}
                        {primitive?.id === "section" && (
                          <div
                            className={`rounded ${
                              comp.props.padding === "large"
                                ? "p-8"
                                : comp.props.padding === "small"
                                  ? "p-2"
                                  : comp.props.padding === "none"
                                    ? ""
                                    : "p-4"
                            } ${
                              comp.props.maxWidth === "narrow"
                                ? "max-w-lg mx-auto"
                                : comp.props.maxWidth === "container"
                                  ? "max-w-4xl mx-auto"
                                  : "w-full"
                            }`}
                            style={{
                              backgroundColor:
                                comp.props.backgroundColor || "transparent",
                            }}
                          >
                            <p className="text-xs text-gray-400 italic text-center">
                              — Section Container —
                            </p>
                          </div>
                        )}

                        {/* ── checkbox ── */}
                        {primitive?.id === "checkbox" && (
                          <label className="flex items-center gap-2 my-1 cursor-default">
                            <input
                              type="checkbox"
                              defaultChecked={comp.props.checked}
                              disabled
                              className="rounded"
                            />
                            <span>
                              {renderPropValue(
                                comp.props.label || "Checkbox label",
                              )}
                            </span>
                          </label>
                        )}

                        {/* ── radiobutton ── */}
                        {primitive?.id === "radiobutton" && (
                          <div className="my-2">
                            {comp.props.label && (
                              <p className="font-medium mb-1">
                                {renderPropValue(comp.props.label)}
                              </p>
                            )}
                            <div className="flex flex-col gap-1">
                              <label className="flex items-center gap-2 cursor-default">
                                <input type="radio" disabled defaultChecked />
                                <span>Option A</span>
                              </label>
                              <label className="flex items-center gap-2 cursor-default">
                                <input type="radio" disabled />
                                <span>Option B</span>
                              </label>
                            </div>
                          </div>
                        )}

                        {/* ── fallback ── */}
                        {![
                          "text",
                          "image",
                          "button",
                          "list",
                          "table",
                          "divider",
                          "link",
                          "spacer",
                          "section",
                          "checkbox",
                          "radiobutton",
                        ].includes(primitive?.id || "") && (
                          <div className="my-2 p-3 bg-gray-100 rounded text-sm text-gray-600">
                            {primitive?.icon} {primitive?.name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center bg-gray-50">
                <p className="text-gray-400 mb-2">Preview will appear here</p>
                <p className="text-xs text-gray-500">
                  Add primitives to see the preview
                </p>
              </div>
            )}

            {component.dataSchema.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-900 mb-2">
                  Sample Data:
                </p>
                <div className="text-xs text-blue-800 font-mono">
                  {JSON.stringify(sampleData, null, 2)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
