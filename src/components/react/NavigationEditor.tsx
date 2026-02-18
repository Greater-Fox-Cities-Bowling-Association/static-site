import { useState, useEffect } from "react";
import type { NavigationConfig, NavigationItem } from "../../types/cms";
import { useTheme } from "../../utils/useTheme";

interface NavigationEditorProps {
  navigationId?: string;
  token: string;
  onSave: () => void;
  onCancel: () => void;
  useGitHubAPI?: boolean;
}

function generateNavItemId(): string {
  return `nav-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function createEmptyNavItem(order: number): NavigationItem {
  return {
    id: generateNavItemId(),
    label: "",
    href: "",
    order,
  };
}

export default function NavigationEditor({
  navigationId,
  token,
  onSave,
  onCancel,
  useGitHubAPI = false,
}: NavigationEditorProps) {
  const { colors } = useTheme();
  const [navigation, setNavigation] = useState<NavigationConfig>({
    id: navigationId || "default",
    name: "Default Navigation",
    description: "",
    items: [],
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (navigationId) {
      loadNavigation();
    }
  }, [navigationId]);

  const loadNavigation = async () => {
    setLoading(true);
    setError(null);

    try {
      const module = await import(
        `../../content/navigation/${navigationId}.json`
      );
      setNavigation(module.default);
    } catch (err) {
      setError("Failed to load navigation configuration");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateNavigation = (updates: Partial<NavigationConfig>) => {
    setNavigation((prev) => ({ ...prev, ...updates }));
  };

  const addTopLevelItem = () => {
    const newItem = createEmptyNavItem(navigation.items.length + 1);
    updateNavigation({ items: [...navigation.items, newItem] });
  };

  const addChildItem = (parentIndex: number) => {
    const newItems = [...navigation.items];
    const parent = newItems[parentIndex];
    const children = parent.children || [];
    const newChild = createEmptyNavItem(children.length + 1);

    newItems[parentIndex] = {
      ...parent,
      children: [...children, newChild],
    };

    updateNavigation({ items: newItems });
  };

  const updateItem = (
    index: number,
    updates: Partial<NavigationItem>,
    childIndex?: number,
  ) => {
    const newItems = [...navigation.items];

    if (childIndex !== undefined) {
      // Updating a child item
      const parent = newItems[index];
      const children = [...(parent.children || [])];
      children[childIndex] = { ...children[childIndex], ...updates };
      newItems[index] = { ...parent, children };
    } else {
      // Updating a top-level item
      newItems[index] = { ...newItems[index], ...updates };
    }

    updateNavigation({ items: newItems });
  };

  const deleteItem = (index: number, childIndex?: number) => {
    const newItems = [...navigation.items];

    if (childIndex !== undefined) {
      // Deleting a child item
      const parent = newItems[index];
      const children = (parent.children || []).filter(
        (_, i) => i !== childIndex,
      );
      newItems[index] = {
        ...parent,
        children: children.length > 0 ? children : undefined,
      };
    } else {
      // Deleting a top-level item
      newItems.splice(index, 1);
      // Reorder remaining items
      newItems.forEach((item, i) => {
        item.order = i + 1;
      });
    }

    updateNavigation({ items: newItems });
  };

  const moveItem = (
    index: number,
    direction: "up" | "down",
    childIndex?: number,
  ) => {
    const newItems = [...navigation.items];

    if (childIndex !== undefined) {
      // Moving a child item
      const parent = newItems[index];
      const children = [...(parent.children || [])];
      const targetIndex = direction === "up" ? childIndex - 1 : childIndex + 1;

      if (targetIndex >= 0 && targetIndex < children.length) {
        [children[childIndex], children[targetIndex]] = [
          children[targetIndex],
          children[childIndex],
        ];
        children.forEach((child, i) => {
          child.order = i + 1;
        });
        newItems[index] = { ...parent, children };
      }
    } else {
      // Moving a top-level item
      const targetIndex = direction === "up" ? index - 1 : index + 1;

      if (targetIndex >= 0 && targetIndex < newItems.length) {
        [newItems[index], newItems[targetIndex]] = [
          newItems[targetIndex],
          newItems[index],
        ];
        newItems.forEach((item, i) => {
          item.order = i + 1;
        });
      }
    }

    updateNavigation({ items: newItems });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      // Update timestamp
      const updatedNavigation = {
        ...navigation,
        updatedAt: new Date().toISOString(),
      };

      // Save to GitHub
      const filePath = `src/content/navigation/${navigation.id}.json`;
      const content = JSON.stringify(updatedNavigation, null, 2);

      const response = await fetch("/api/github/save-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          filePath,
          content,
          message: `Update navigation: ${navigation.name}`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save navigation");
      }

      onSave();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save navigation",
      );
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p style={{ color: colors.textSecondary }}>Loading navigation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ color: colors.text }} className="text-2xl font-bold">
            {navigationId ? "Edit Navigation" : "Create Navigation"}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              style={{
                borderColor: colors.secondary,
                color: colors.text,
              }}
              className="px-4 py-2 border rounded-md hover:bg-opacity-10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                backgroundColor: colors.primary,
                color: colors.background,
              }}
              className="px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Navigation"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
      </div>

      {/* Basic Info */}
      <div className="mb-6 p-6 bg-background border border-text/10 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              value={navigation.name}
              onChange={(e) => updateNavigation({ name: e.target.value })}
              style={{
                backgroundColor: colors.background,
                borderColor: colors.secondary,
                color: colors.text,
              }}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
              placeholder="Navigation name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Description
            </label>
            <input
              type="text"
              value={navigation.description || ""}
              onChange={(e) =>
                updateNavigation({ description: e.target.value })
              }
              style={{
                backgroundColor: colors.background,
                borderColor: colors.secondary,
                color: colors.text,
              }}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
              placeholder="Optional description"
            />
          </div>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Navigation Items</h3>
          <button
            onClick={addTopLevelItem}
            style={{
              backgroundColor: colors.primary,
              color: colors.background,
            }}
            className="px-4 py-2 rounded-md hover:opacity-90 transition-opacity text-sm"
          >
            + Add Item
          </button>
        </div>

        <div className="space-y-4">
          {navigation.items.map((item, index) => (
            <div
              key={item.id}
              className="p-4 bg-background border border-text/10 rounded-lg"
            >
              {/* Top-level item */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.label}
                      onChange={(e) =>
                        updateItem(index, { label: e.target.value })
                      }
                      style={{
                        backgroundColor: colors.background,
                        borderColor: colors.secondary,
                        color: colors.text,
                      }}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                      placeholder="Label (e.g., 'Honors')"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={item.href}
                      onChange={(e) =>
                        updateItem(index, { href: e.target.value })
                      }
                      style={{
                        backgroundColor: colors.background,
                        borderColor: colors.secondary,
                        color: colors.text,
                      }}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                      placeholder="URL (e.g., '/honors')"
                    />
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => moveItem(index, "up")}
                      disabled={index === 0}
                      className="px-2 py-1 text-sm border rounded disabled:opacity-30"
                      title="Move up"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveItem(index, "down")}
                      disabled={index === navigation.items.length - 1}
                      className="px-2 py-1 text-sm border rounded disabled:opacity-30"
                      title="Move down"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => deleteItem(index)}
                      className="px-2 py-1 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50"
                      title="Delete"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* Child items */}
                {item.children && item.children.length > 0 && (
                  <div className="ml-6 mt-3 space-y-2 border-l-2 border-primary/20 pl-4">
                    {item.children.map((child, childIndex) => (
                      <div key={child.id} className="flex gap-2">
                        <div className="flex-1">
                          <input
                            type="text"
                            value={child.label}
                            onChange={(e) =>
                              updateItem(
                                index,
                                { label: e.target.value },
                                childIndex,
                              )
                            }
                            style={{
                              backgroundColor: colors.background,
                              borderColor: colors.secondary,
                              color: colors.text,
                            }}
                            className="w-full px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-1"
                            placeholder="Submenu label"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={child.href}
                            onChange={(e) =>
                              updateItem(
                                index,
                                { href: e.target.value },
                                childIndex,
                              )
                            }
                            style={{
                              backgroundColor: colors.background,
                              borderColor: colors.secondary,
                              color: colors.text,
                            }}
                            className="w-full px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-1"
                            placeholder="Submenu URL"
                          />
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => moveItem(index, "up", childIndex)}
                            disabled={childIndex === 0}
                            className="px-1 py-1 text-xs border rounded disabled:opacity-30"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => moveItem(index, "down", childIndex)}
                            disabled={
                              childIndex === (item.children?.length || 0) - 1
                            }
                            className="px-1 py-1 text-xs border rounded disabled:opacity-30"
                            title="Move down"
                          >
                            ↓
                          </button>
                          <button
                            onClick={() => deleteItem(index, childIndex)}
                            className="px-1 py-1 text-xs border border-red-300 text-red-600 rounded hover:bg-red-50"
                            title="Delete"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add child button */}
                <button
                  onClick={() => addChildItem(index)}
                  style={{
                    borderColor: colors.secondary,
                    color: colors.text,
                  }}
                  className="ml-6 px-3 py-1 text-sm border rounded-md hover:bg-primary/10 transition-colors"
                >
                  + Add Submenu Item
                </button>
              </div>
            </div>
          ))}

          {navigation.items.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No navigation items yet. Click "Add Item" to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
