import { useState } from "react";
import type {
  ContentListSection,
  ContentListDisplayMode,
} from "../../../types/cms";
import type { SectionEditorProps } from "../../../types/cms";
import SectionWrapper from "./SectionWrapper";

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

  const updateField = <K extends keyof ContentListSection>(
    field: K,
    value: ContentListSection[K],
  ) => {
    onChange({ ...section, [field]: value });
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
            placeholder="Enter collection name (e.g., centers, honors)"
          />
          <datalist id="collection-suggestions">
            <option value="centers">Bowling Centers</option>
            <option value="honors">Honors & Awards</option>
            <option value="news">News Articles</option>
            <option value="tournaments">Tournaments</option>
            <option value="committees">Committees</option>
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
            {section.itemIds && section.itemIds.length > 0 && (
              <button
                onClick={clearAllItems}
                className="text-xs text-red-600 hover:text-red-700"
              >
                Clear All
              </button>
            )}
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
    </SectionWrapper>
  );
}
