import { useState } from "react";
import Papa from "papaparse";
import type {
  ContentListSection,
  ContentListDisplayMode,
  ContentListStyles,
} from "../../../types/cms";
import type { SectionEditorProps } from "../../../types/cms";
import SectionWrapper from "./SectionWrapper";
import { useTheme } from "../../../utils/useTheme";

type ContentListEditorProps = SectionEditorProps & {
  section: ContentListSection;
};

export default function ContentListEditor({
  section,
  onChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: ContentListEditorProps) {
  const [newItemId, setNewItemId] = useState("");
  const [showCSVImport, setShowCSVImport] = useState(false);
  const [csvParsing, setCsvParsing] = useState(false);
  const { colors } = useTheme();

  const THEME_COLOR_KEYS = [
    "primary",
    "secondary",
    "background",
    "text",
    "textSecondary",
    "accent",
  ] as const;

  const updateField = <K extends keyof ContentListSection>(
    field: K,
    value: ContentListSection[K],
  ) => {
    onChange({ ...section, [field]: value });
  };

  const updateStyle = (key: keyof ContentListStyles, value: string) => {
    const current = section.styles ?? {};
    onChange({ ...section, styles: { ...current, [key]: value || undefined } });
  };

  // Render a row of theme color swatches for a single ContentListStyles field
  const ColorSwatchField = ({
    label: fieldLabel,
    field,
  }: {
    label: string;
    field: keyof ContentListStyles;
  }) => {
    const active = section.styles?.[field];
    return (
      <div className="py-1.5">
        <span className="block text-xs mb-1 text-text-secondary">
          {fieldLabel}
        </span>
        <div className="flex flex-wrap gap-1.5 items-center">
          {THEME_COLOR_KEYS.map((key) => {
            const hex = (colors[key] || "").trim();
            if (!hex) return null;
            const isActive = active === key;
            return (
              <button
                key={key}
                type="button"
                title={`${key}: ${hex}`}
                onClick={() => updateStyle(field, isActive ? "" : key)}
                className="w-8 h-8 rounded border-2 transition-all"
                style={{
                  backgroundColor: hex,
                  borderColor: isActive ? colors.text : "#00000033",
                  outline: isActive ? `2px solid ${hex}` : "none",
                  outlineOffset: "2px",
                }}
              />
            );
          })}
          {active && (
            <>
              <span className="text-xs font-mono text-text-secondary">
                {active}
              </span>
              <button
                type="button"
                onClick={() => updateStyle(field, "")}
                className="text-xs px-1.5 rounded hover:opacity-80 text-text-secondary"
                title="Clear"
              >
                ✕
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const addItemId = () => {
    if (!newItemId.trim()) return;
    const currentIds = section.itemIds || [];
    if (!currentIds.includes(newItemId.trim())) {
      updateField("itemIds", [...currentIds, newItemId.trim()]);
      setNewItemId("");
    }
  };

  const removeItemId = (id: string) => {
    const currentIds = section.itemIds || [];
    updateField(
      "itemIds",
      currentIds.filter((i) => i !== id),
    );
  };

  const clearAllItems = () => {
    updateField("itemIds", undefined);
  };

  const handleCSVFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Please upload a CSV file");
      return;
    }

    setCsvParsing(true);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvParsing(false);

        if (results.errors.length > 0) {
          alert(
            `CSV parsing error: ${results.errors[0]?.message || "Unknown error"}`,
          );
          return;
        }

        // Extract item IDs from the first column or 'id' column
        const data = results.data as Record<string, any>[];
        const itemIds: string[] = [];

        data.forEach((row) => {
          // Look for 'id', 'slug', or the first column value
          const id = row.id || row.slug || Object.values(row)[0];
          if (id && typeof id === "string") {
            itemIds.push(id.trim());
          }
        });

        if (itemIds.length === 0) {
          alert(
            "No valid item IDs found in CSV. Make sure the CSV has an 'id' or 'slug' column.",
          );
          return;
        }

        // Add the imported IDs to the current list
        const currentIds = section.itemIds || [];
        const newIds = [
          ...currentIds,
          ...itemIds.filter((id) => !currentIds.includes(id)),
        ];
        updateField("itemIds", newIds);
        setShowCSVImport(false);
        alert(`Successfully imported ${itemIds.length} item IDs from CSV!`);
      },
      error: (error) => {
        setCsvParsing(false);
        alert(`Error reading file: ${error.message}`);
      },
    });
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCSVFile(file);
    }
  };

  return (
    <SectionWrapper
      type="contentList"
      onDelete={onDelete}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Section Heading
          </label>
          <input
            type="text"
            value={section.heading || ""}
            onChange={(e) => updateField("heading", e.target.value)}
            className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Section heading (optional)"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Content Collection
          </label>
          <input
            type="text"
            value={section.collection}
            onChange={(e) => updateField("collection", e.target.value)}
            list="collection-suggestions"
            className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="Enter collection name (e.g., news, events)"
          />
          <datalist id="collection-suggestions">
            {/* Options are populated at runtime from collection-defs — no hardcoded tenant values */}
          </datalist>
          <p className="mt-1 text-xs text-text-secondary">
            Enter the collection name from your content config (suggestions
            shown, or type your own)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Display Mode
          </label>
          <select
            value={section.displayMode}
            onChange={(e) =>
              updateField(
                "displayMode",
                e.target.value as ContentListDisplayMode,
              )
            }
            className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="cards">Cards</option>
            <option value="table">Table</option>
            <option value="list">List</option>
          </select>
        </div>

        {section.displayMode === "cards" && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Number of Columns
            </label>
            <select
              value={section.columns || 3}
              onChange={(e) =>
                updateField("columns", parseInt(e.target.value) as 2 | 3 | 4)
              }
              className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="2">2 Columns</option>
              <option value="3">3 Columns</option>
              <option value="4">4 Columns</option>
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            Item Limit
          </label>
          <input
            type="number"
            min="0"
            value={section.limit || ""}
            onChange={(e) => {
              const val = e.target.value;
              updateField("limit", val ? parseInt(val) : undefined);
            }}
            className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="No limit (show all)"
          />
          <p className="mt-1 text-xs text-text-secondary">
            Maximum number of items to display (leave empty to show all)
          </p>
        </div>

        <div>
          <div className="flex items-start justify-between mb-2">
            <div>
              <label className="block text-sm font-medium text-text-secondary">
                Specific Items
              </label>
              <p className="text-xs text-text-secondary mt-1">
                Leave empty to show all items from the collection. Add specific
                item IDs to only show those items.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowCSVImport(true)}
                className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                📥 Import from CSV
              </button>
              {section.itemIds && section.itemIds.length > 0 && (
                <button
                  onClick={clearAllItems}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newItemId}
              onChange={(e) => setNewItemId(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addItemId()}
              className="flex-1 px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Enter item ID (e.g., bowlero-sabre-lanes)"
            />
            <button
              onClick={addItemId}
              className="px-4 py-2 bg-primary text-background rounded hover:bg-accent"
            >
              Add
            </button>
          </div>

          {section.itemIds && section.itemIds.length > 0 && (
            <div className="space-y-2">
              {section.itemIds.map((id) => (
                <div
                  key={id}
                  className="flex items-center justify-between px-3 py-2 bg-background border border-text/10 rounded"
                >
                  <span className="text-sm font-mono">{id}</span>
                  <button
                    onClick={() => removeItemId(id)}
                    className="text-red-600 hover:text-red-700 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={section.showFilters || false}
              onChange={(e) => updateField("showFilters", e.target.checked)}
              className="rounded border-text/20 focus:ring-2 focus:ring-primary"
            />
            <span className="text-sm font-medium text-text-secondary">
              Show search/filter controls (coming soon)
            </span>
          </label>
        </div>

        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded">
          <details>
            <summary className="cursor-pointer text-sm font-medium text-text-secondary select-none">
              Style Overrides
            </summary>
            <div className="mt-3 space-y-1">
              <ColorSwatchField label="Section Background" field="sectionBg" />
              <ColorSwatchField label="Heading Color" field="headingColor" />
              <ColorSwatchField label="Card / Row Background" field="cardBg" />
              <ColorSwatchField label="Card / Row Border" field="cardBorder" />
              <ColorSwatchField label="Title Color" field="titleColor" />
              <ColorSwatchField
                label="Subtitle / Date Color"
                field="subtitleColor"
              />
              <ColorSwatchField
                label="Body / Description Color"
                field="bodyColor"
              />
              <ColorSwatchField label="Link Color" field="linkColor" />
              {section.styles &&
                Object.values(section.styles).some(Boolean) && (
                  <button
                    type="button"
                    onClick={() => onChange({ ...section, styles: {} })}
                    className="mt-2 w-full py-1 text-xs rounded border hover:opacity-80"
                    style={{ borderColor: "#ef4444", color: "#ef4444" }}
                  >
                    Clear all style overrides
                  </button>
                )}
            </div>
          </details>
        </div>

        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded">
          <p className="text-sm text-text-secondary">
            <strong>Preview:</strong> This section will display{" "}
            {section.itemIds && section.itemIds.length > 0
              ? `${section.itemIds.length} specific item${section.itemIds.length > 1 ? "s" : ""}`
              : section.limit
                ? `up to ${section.limit} items`
                : "all items"}{" "}
            from the <strong>{section.collection}</strong> collection in{" "}
            <strong>{section.displayMode}</strong> format.
          </p>
        </div>
      </div>

      {/* CSV Import Modal */}
      {showCSVImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-text mb-4">
              Import Item IDs from CSV
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-text-secondary mb-3">
                  Upload a CSV file with item IDs. The first column or 'id'
                  column will be used to extract item IDs.
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  disabled={csvParsing}
                  className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              {csvParsing && (
                <div className="flex items-center gap-2 text-primary">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  <span className="text-sm">Parsing CSV...</span>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCSVImport(false)}
                  disabled={csvParsing}
                  className="px-4 py-2 border border-text/20 rounded hover:bg-text/5"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionWrapper>
  );
}
