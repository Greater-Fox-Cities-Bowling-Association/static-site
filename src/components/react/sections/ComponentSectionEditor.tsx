import { useState, useEffect } from "react";
import type {
  ComponentSection,
  PrimitiveComponent,
  CompositeComponent,
} from "../../../types/cms";
import {
  fetchPrimitiveComponents,
  fetchCompositeComponents,
} from "../../../utils/githubApi";
import { useSectionEditorContext } from "./SectionEditorContext";

interface ComponentSectionEditorProps {
  section: ComponentSection;
  onChange: (updated: ComponentSection) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  token: string;
  useGitHubAPI: boolean;
}

// Shared preview renderer — same logic as CompositeComponentEditor
function renderPrimitivePreview(
  primitiveId: string,
  props: Record<string, any>,
  data: Record<string, any>,
) {
  const resolve = (val: any): string => {
    if (typeof val !== "string") return val;
    return val.replace(/\{\{(\w+)\}\}/g, (_, k) => data[k] ?? `{{${k}}}`);
  };

  switch (primitiveId) {
    case "text":
      return (
        <div style={{ textAlign: (props.alignment as any) || "left" }}>
          {props.heading && (
            <h3 className="text-xl font-bold mb-1">{resolve(props.heading)}</h3>
          )}
          {props.content && (
            <p className="text-gray-700 leading-relaxed">
              {resolve(props.content)}
            </p>
          )}
        </div>
      );
    case "image":
      return (
        <div className="my-2">
          <div
            className="bg-gradient-to-br from-gray-200 to-gray-300 rounded flex flex-col items-center justify-center text-gray-500"
            style={{
              width: props.width || "100%",
              height: props.height || "180px",
            }}
          >
            <span className="text-4xl mb-1">🖼️</span>
            <span className="text-sm">{resolve(props.alt || "Image")}</span>
          </div>
          {props.caption && (
            <p className="text-sm text-gray-500 text-center mt-1 italic">
              {resolve(props.caption)}
            </p>
          )}
        </div>
      );
    case "button":
      return (
        <div className="my-2">
          <span
            className={`inline-block rounded font-medium ${
              props.style === "secondary"
                ? "bg-gray-700 text-white"
                : props.style === "outline"
                  ? "border-2 border-blue-600 text-blue-600"
                  : props.style === "text"
                    ? "text-blue-600 underline"
                    : "bg-blue-600 text-white"
            } ${
              props.size === "small"
                ? "text-sm px-3 py-1"
                : props.size === "large"
                  ? "text-lg px-8 py-3"
                  : "px-5 py-2"
            }`}
          >
            {resolve(props.text || "Button")}
          </span>
        </div>
      );
    case "list":
      return (
        <div className="my-2">
          {props.heading && (
            <h4 className="font-semibold mb-1">{resolve(props.heading)}</h4>
          )}
          {props.ordered ? (
            <ol className="list-decimal list-inside text-gray-700 space-y-1">
              {(
                data[props.items?.replace?.(/\{\{(\w+)\}\}/, "$1")] || [
                  "Item 1",
                  "Item 2",
                ]
              ).map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          ) : (
            <ul className="list-disc list-inside text-gray-700 space-y-1">
              {(
                data[props.items?.replace?.(/\{\{(\w+)\}\}/, "$1")] || [
                  "Item 1",
                  "Item 2",
                ]
              ).map((item: string, i: number) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      );
    case "divider":
      return (
        <hr
          className={`border-gray-300 ${
            props.thickness === "thick"
              ? "border-t-4"
              : props.thickness === "medium"
                ? "border-t-2"
                : "border-t"
          } ${
            props.margin === "large"
              ? "my-8"
              : props.margin === "small"
                ? "my-2"
                : "my-4"
          }`}
          style={{ borderColor: props.color || undefined }}
        />
      );
    case "link":
      return (
        <a
          className={`text-blue-600 ${props.underline !== false ? "underline" : ""}`}
        >
          {resolve(props.text || "Link")}
        </a>
      );
    case "spacer":
      return (
        <div
          className={
            props.size === "small"
              ? "h-2"
              : props.size === "large"
                ? "h-12"
                : props.size === "xlarge"
                  ? "h-24"
                  : "h-6"
          }
        />
      );
    case "section":
      return (
        <div
          className={`rounded ${
            props.padding === "large"
              ? "p-8"
              : props.padding === "small"
                ? "p-2"
                : props.padding === "none"
                  ? ""
                  : "p-4"
          }`}
          style={{ backgroundColor: props.backgroundColor || "transparent" }}
        >
          <p className="text-xs text-gray-400 italic text-center">
            — Section Container —
          </p>
        </div>
      );
    case "checkbox":
      return (
        <label className="flex items-center gap-2 my-1 cursor-default">
          <input
            type="checkbox"
            defaultChecked={props.checked}
            disabled
            className="rounded"
          />
          <span>{resolve(props.label || "Checkbox")}</span>
        </label>
      );
    case "radiobutton":
      return (
        <div className="my-2">
          {props.label && (
            <p className="font-medium mb-1">{resolve(props.label)}</p>
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
      );
    default:
      return (
        <div className="text-sm text-gray-400 italic">({primitiveId})</div>
      );
  }
}

export default function ComponentSectionEditor({
  section,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  token,
  useGitHubAPI,
}: ComponentSectionEditorProps) {
  const { panelMode } = useSectionEditorContext();
  const [expanded, setExpanded] = useState(true);
  const [componentDef, setComponentDef] = useState<
    PrimitiveComponent | CompositeComponent | null
  >(null);
  const [loadingDef, setLoadingDef] = useState(true);

  useEffect(() => {
    loadDefinition();
  }, [section.componentId, section.componentType]);

  const loadDefinition = async () => {
    setLoadingDef(true);
    try {
      if (section.componentType === "primitive") {
        const prims = await fetchPrimitiveComponents(
          token,
          undefined,
          undefined,
          useGitHubAPI,
        );
        const found = prims.find((p) => p.id === section.componentId);
        setComponentDef(found || null);
      } else {
        const [, composites] = await Promise.all([
          fetchPrimitiveComponents(token, undefined, undefined, useGitHubAPI),
          fetchCompositeComponents(token, undefined, undefined, useGitHubAPI),
        ]);
        const found = composites.find((c) => c.id === section.componentId);
        setComponentDef(found || null);
      }
    } catch (err) {
      console.error("Error loading component definition:", err);
    } finally {
      setLoadingDef(false);
    }
  };

  const updateData = (key: string, value: any) => {
    onChange({ ...section, data: { ...section.data, [key]: value } });
  };

  const dataSchema =
    componentDef?.type === "composite"
      ? componentDef.dataSchema
      : componentDef?.type === "primitive"
        ? componentDef.fields
        : [];

  const icon = componentDef?.icon || "🧩";
  const name = section.label || componentDef?.name || section.componentId;

  // ── Panel mode: rendered inside the slide-out edit panel ──
  // Show only the form fields; the panel chrome provides the header/controls.
  if (panelMode) {
    return (
      <div className="p-5 space-y-4">
        {/* Label */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Section Label{" "}
            <span className="text-gray-400">(optional display name)</span>
          </label>
          <input
            type="text"
            value={section.label || ""}
            onChange={(e) => onChange({ ...section, label: e.target.value })}
            placeholder={componentDef?.name || section.componentId}
            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
          />
        </div>

        {/* Column span */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            Column span
            {componentDef?.type === "composite" && (
              <span className="text-gray-400 ml-1">
                (min {(componentDef as CompositeComponent).minColumns})
              </span>
            )}
          </label>
          <div className="flex gap-1">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((col) => {
              const minCol =
                componentDef?.type === "composite"
                  ? ((componentDef as CompositeComponent).minColumns ?? 1)
                  : 1;
              const disabled = col < minCol;
              const exact = col === section.columns;
              const active = col <= section.columns;
              return (
                <button
                  key={col}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ ...section, columns: col })}
                  className={`flex-1 h-5 rounded-sm text-xs font-bold transition-all border ${
                    disabled
                      ? "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed"
                      : exact
                        ? "bg-blue-600 border-blue-700 text-white"
                        : active
                          ? "bg-blue-200 border-blue-300 text-blue-800"
                          : "bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {exact ? col : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Data Fields */}
        {loadingDef ? (
          <p className="text-sm text-gray-500">Loading fields…</p>
        ) : dataSchema.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            This component has no configurable data fields.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Content
            </p>
            {dataSchema.map((field) => {
              const value = section.data[field.name] ?? "";
              return (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                    {field.description && (
                      <span className="text-xs text-gray-400 ml-2 font-normal">
                        {field.description}
                      </span>
                    )}
                  </label>
                  {field.type === "boolean" ? (
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) =>
                          updateData(field.name, e.target.checked)
                        }
                        className="rounded"
                      />
                      <span className="text-sm text-gray-600">
                        {field.label}
                      </span>
                    </label>
                  ) : field.type === "number" ? (
                    <input
                      type="number"
                      value={value}
                      onChange={(e) =>
                        updateData(field.name, Number(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  ) : field.type === "array" ? (
                    <textarea
                      value={Array.isArray(value) ? value.join("\n") : value}
                      onChange={(e) =>
                        updateData(
                          field.name,
                          e.target.value.split("\n").filter(Boolean),
                        )
                      }
                      rows={3}
                      placeholder="One item per line"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono"
                    />
                  ) : field.type === "enum" && (field as any).values ? (
                    <select
                      value={value}
                      onChange={(e) => updateData(field.name, e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="">— select —</option>
                      {((field as any).values as string[]).map((v) => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  ) : (field as any).multiline ? (
                    <textarea
                      value={value}
                      onChange={(e) => updateData(field.name, e.target.value)}
                      rows={4}
                      placeholder={`Enter ${field.label.toLowerCase()}…`}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  ) : (
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => updateData(field.name, e.target.value)}
                      placeholder={`Enter ${field.label.toLowerCase()}…`}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-4 border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-50 px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <div>
            <span className="font-semibold text-gray-900">{name}</span>
            <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full capitalize">
              {section.componentType}
            </span>
            <span className="ml-1 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">
              {section.columns}/12
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            title="Move up"
            className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            title="Move down"
            className="p-1.5 text-gray-500 hover:text-gray-800 disabled:opacity-30"
          >
            ↓
          </button>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-gray-500 hover:text-gray-800"
          >
            {expanded ? "▲" : "▼"}
          </button>
          <button
            onClick={onDelete}
            title="Remove"
            className="p-1.5 text-red-500 hover:text-red-700 ml-1"
          >
            ✕
          </button>
        </div>
      </div>

      {expanded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          {/* LEFT: Data form */}
          <div className="p-4 space-y-4">
            {/* Display label */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Section Label{" "}
                <span className="text-gray-400">
                  (optional, for your reference)
                </span>
              </label>
              <input
                type="text"
                value={section.label || ""}
                onChange={(e) =>
                  onChange({ ...section, label: e.target.value })
                }
                placeholder={componentDef?.name || section.componentId}
                className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
              />
            </div>

            {/* Column span */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Column span
                {componentDef?.type === "composite" && (
                  <span className="text-gray-400 ml-1">
                    (min {(componentDef as CompositeComponent).minColumns})
                  </span>
                )}
              </label>
              <div className="flex gap-1">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((col) => {
                  const minCol =
                    componentDef?.type === "composite"
                      ? (componentDef as CompositeComponent).minColumns
                      : 1;
                  const disabled = col < minCol;
                  const active = col <= section.columns;
                  const exact = col === section.columns;
                  return (
                    <button
                      key={col}
                      type="button"
                      disabled={disabled}
                      onClick={() => onChange({ ...section, columns: col })}
                      className={`flex-1 h-5 rounded-sm text-xs font-bold transition-all border ${
                        disabled
                          ? "bg-gray-100 border-gray-200 text-gray-300 cursor-not-allowed"
                          : exact
                            ? "bg-blue-600 border-blue-700 text-white"
                            : active
                              ? "bg-blue-200 border-blue-300 text-blue-800"
                              : "bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {exact ? col : ""}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Data Fields */}
            {loadingDef ? (
              <p className="text-sm text-gray-500">Loading fields...</p>
            ) : dataSchema.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                This component has no configurable data fields.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                  Content
                </p>
                {dataSchema.map((field) => {
                  const value = section.data[field.name] ?? "";
                  return (
                    <div key={field.name}>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                        {field.description && (
                          <span className="text-xs text-gray-400 ml-2 font-normal">
                            {field.description}
                          </span>
                        )}
                      </label>
                      {field.type === "boolean" ? (
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!value}
                            onChange={(e) =>
                              updateData(field.name, e.target.checked)
                            }
                            className="rounded"
                          />
                          <span className="text-sm text-gray-600">
                            {field.label}
                          </span>
                        </label>
                      ) : field.type === "number" ? (
                        <input
                          type="number"
                          value={value}
                          onChange={(e) =>
                            updateData(field.name, Number(e.target.value))
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                      ) : field.type === "array" ? (
                        <textarea
                          value={
                            Array.isArray(value) ? value.join("\n") : value
                          }
                          onChange={(e) =>
                            updateData(
                              field.name,
                              e.target.value.split("\n").filter(Boolean),
                            )
                          }
                          rows={3}
                          placeholder="One item per line"
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono"
                        />
                      ) : field.type === "enum" && (field as any).values ? (
                        <select
                          value={value}
                          onChange={(e) =>
                            updateData(field.name, e.target.value)
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="">— select —</option>
                          {((field as any).values as string[]).map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      ) : (field as any).multiline ? (
                        <textarea
                          value={value}
                          onChange={(e) =>
                            updateData(field.name, e.target.value)
                          }
                          rows={4}
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <input
                          type="text"
                          value={value}
                          onChange={(e) =>
                            updateData(field.name, e.target.value)
                          }
                          placeholder={`Enter ${field.label.toLowerCase()}...`}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Live preview */}
          <div className="p-4 bg-gray-50">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">
              Preview
            </p>
            <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
              {loadingDef ? (
                <p className="text-sm text-gray-400 italic">
                  Loading preview...
                </p>
              ) : componentDef?.type === "primitive" ? (
                // Primitive: render directly
                renderPrimitivePreview(
                  componentDef.id,
                  section.data, // for primitives, data IS the props
                  section.data,
                )
              ) : componentDef?.type === "composite" ? (
                // Composite: render each child primitive with data substitution
                <div>
                  {(componentDef as CompositeComponent).components.map(
                    (child) => {
                      return (
                        <div key={child.id}>
                          {renderPrimitivePreview(
                            child.primitive,
                            child.props,
                            section.data,
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 italic">
                  Component not found.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
