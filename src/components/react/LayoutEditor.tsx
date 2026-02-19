import { useState, useEffect } from "react";
import type {
  Layout,
  LayoutHeader,
  LayoutFooter,
  NavigationConfig,
} from "../../types/cms";
import {
  fetchLayoutContent,
  saveLayoutFile,
  fetchNavigationDirectory,
} from "../../utils/githubApi";

interface LayoutEditorProps {
  layoutId: string | undefined; // undefined = creating new layout
  token: string;
  onSave: () => void;
  onCancel: () => void;
  useGitHubAPI?: boolean;
}

function generateLayoutId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createEmptyLayout(): Layout {
  return {
    id: "",
    name: "",
    description: "",
    header: {
      showNavigation: true,
      navigationStyle: "default",
    },
    footer: {
      showFooter: true,
      footerStyle: "default",
    },
  };
}

export default function LayoutEditor({
  layoutId,
  token,
  onSave,
  onCancel,
  useGitHubAPI = false,
}: LayoutEditorProps) {
  const [layout, setLayout] = useState<Layout>(createEmptyLayout());
  const [loading, setLoading] = useState(!!layoutId);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [availableNavigation, setAvailableNavigation] = useState<string[]>([]);

  useEffect(() => {
    if (layoutId) {
      loadLayoutFromGitHub();
    }
    loadAvailableNavigation();
  }, [layoutId]);

  const loadLayoutFromGitHub = async () => {
    if (!layoutId) return;

    setLoading(true);
    try {
      const result = await fetchLayoutContent(
        layoutId,
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );

      if (result.success && result.content) {
        setLayout(result.content);
      } else {
        alert(`Failed to load layout: ${result.error}`);
      }
    } catch (error) {
      alert(
        `Error loading layout: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableNavigation = async () => {
    try {
      const result = await fetchNavigationDirectory(
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );

      if (result.success && result.files) {
        // Extract navigation IDs from filenames (e.g., "default.json" -> "default")
        const navIds = result.files.map((file) =>
          file.name.replace(/\.json$/, ""),
        );
        setAvailableNavigation(navIds);
      }
    } catch (error) {
      console.error("Error loading navigation menus:", error);
      // Set a default if loading fails
      setAvailableNavigation(["default"]);
    }
  };

  const updateLayout = (updates: Partial<Layout>) => {
    setLayout((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const updateHeader = (updates: Partial<LayoutHeader>) => {
    updateLayout({ header: { ...layout.header, ...updates } });
  };

  const updateFooter = (updates: Partial<LayoutFooter>) => {
    updateLayout({ footer: { ...layout.footer, ...updates } });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!layout.name.trim()) {
      newErrors.name = "Layout name is required";
    }

    if (!layout.id.trim()) {
      newErrors.id = "Layout ID is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePublish = async () => {
    if (!validate()) {
      alert("Please fix validation errors before saving");
      return;
    }

    setSaving(true);
    try {
      const result = await saveLayoutFile(
        layout.id,
        layout,
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );

      if (result.success) {
        setHasUnsavedChanges(false);
        alert("Layout saved successfully!");
        onSave();
      } else {
        alert(`Failed to save: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      alert(
        `Error saving layout: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleNameChange = (name: string) => {
    const updates: Partial<Layout> = { name };

    // Auto-generate ID for new layouts
    if (!layoutId) {
      updates.id = generateLayoutId(name);
    }

    updateLayout(updates);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-secondary">Loading layout...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text">
          {layoutId ? "Edit Layout" : "Create New Layout"}
        </h2>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-text/20 rounded-lg hover:bg-primary/5"
          >
            Cancel
          </button>

          <button
            onClick={handlePublish}
            className="px-4 py-2 bg-primary text-background rounded-lg hover:bg-accent disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Layout"}
          </button>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="mb-4 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          You have unsaved changes
        </div>
      )}

      {/* Basic Information */}
      <div className="mb-6 p-6 bg-background border border-text/10 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Layout Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={layout.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                errors.name ? "border-red-500" : "border-text/20"
              }`}
              placeholder="e.g., Blog Layout, Landing Page Layout"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              A human-readable name for this layout
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Layout ID <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={layout.id}
              onChange={(e) =>
                updateLayout({ id: generateLayoutId(e.target.value) })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm ${
                errors.id ? "border-red-500" : "border-text/20"
              }`}
              placeholder="layout-id"
              disabled={!!layoutId} // Can't change ID when editing
            />
            {errors.id && (
              <p className="mt-1 text-sm text-red-500">{errors.id}</p>
            )}
            {layoutId && (
              <p className="mt-1 text-xs text-gray-500">
                Layout ID cannot be changed when editing
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Unique identifier used to select this layout for pages
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Description
            </label>
            <textarea
              value={layout.description}
              onChange={(e) => updateLayout({ description: e.target.value })}
              className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              rows={3}
              placeholder="Describe what this layout is for and when to use it"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional description to help you remember the purpose of this
              layout
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Configuration */}
      <div className="mb-6 p-6 bg-background border border-text/10 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Navigation Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              Navigation Menu
            </label>
            <select
              value={layout.navigationId || ""}
              onChange={(e) =>
                updateLayout({
                  navigationId: e.target.value || undefined,
                })
              }
              className="w-full px-3 py-2 border border-text/20 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">None (Use default navigation)</option>
              {availableNavigation.map((navId) => (
                <option key={navId} value={navId}>
                  {navId.charAt(0).toUpperCase() + navId.slice(1)}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Select which navigation menu to use with this layout. Leave empty
              to use the default navigation.
            </p>
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <div className="text-lg">ℹ️</div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">
                  Navigation & Layout Integration
                </p>
                <p>
                  The navigation menu is part of the layout configuration. Each
                  layout can specify which navigation menu to use in the header,
                  allowing different page styles to have different navigation
                  structures.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Header Configuration */}
      <div className="mb-6 p-6 bg-background border border-text/10 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Header Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={layout.header.showNavigation}
                onChange={(e) =>
                  updateHeader({ showNavigation: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Show Navigation
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500 ml-6">
              Display the navigation menu at the top of pages using this layout
            </p>
          </div>

          {layout.header.showNavigation && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Navigation Style
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="navStyle"
                    value="default"
                    checked={layout.header.navigationStyle === "default"}
                    onChange={(e) =>
                      updateHeader({ navigationStyle: e.target.value as any })
                    }
                    className="w-4 h-4 text-primary border-text/20 rounded focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-gray-700">Default (Full)</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="navStyle"
                    value="minimal"
                    checked={layout.header.navigationStyle === "minimal"}
                    onChange={(e) =>
                      updateHeader({ navigationStyle: e.target.value as any })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Minimal</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="navStyle"
                    value="full"
                    checked={layout.header.navigationStyle === "full"}
                    onChange={(e) =>
                      updateHeader({ navigationStyle: e.target.value as any })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Full Width</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={layout.header.customNavigation || false}
                onChange={(e) =>
                  updateHeader({ customNavigation: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Custom Navigation
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500 ml-6">
              Use custom navigation for this layout instead of the default
            </p>
          </div>
        </div>
      </div>

      {/* Footer Configuration */}
      <div className="mb-6 p-6 bg-background border border-text/10 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Footer Configuration</h3>

        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={layout.footer.showFooter}
                onChange={(e) => updateFooter({ showFooter: e.target.checked })}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Show Footer
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500 ml-6">
              Display the footer at the bottom of pages using this layout
            </p>
          </div>

          {layout.footer.showFooter && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Footer Style
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="footerStyle"
                    value="default"
                    checked={layout.footer.footerStyle === "default"}
                    onChange={(e) =>
                      updateFooter({ footerStyle: e.target.value as any })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Default</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="footerStyle"
                    value="minimal"
                    checked={layout.footer.footerStyle === "minimal"}
                    onChange={(e) =>
                      updateFooter({ footerStyle: e.target.value as any })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Minimal</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="footerStyle"
                    value="full"
                    checked={layout.footer.footerStyle === "full"}
                    onChange={(e) =>
                      updateFooter({ footerStyle: e.target.value as any })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Full Width</span>
                </label>
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={layout.footer.customFooter || false}
                onChange={(e) =>
                  updateFooter({ customFooter: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Custom Footer
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500 ml-6">
              Use custom footer for this layout instead of the default
            </p>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="mb-6 p-6 bg-background border border-text/10 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Layout Preview</h3>
        <div className="bg-background border border-text/10 p-8 rounded-lg border-2 border-dashed border-text/20">
          <div className="space-y-6">
            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Header
              </div>
              <div className="bg-white border border-gray-300 p-4 rounded">
                {layout.header.showNavigation ? (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Navigation ({layout.header.navigationStyle})
                    </div>
                    <div className="flex gap-2">
                      <div className="w-12 h-4 bg-gray-300 rounded"></div>
                      <div className="w-12 h-4 bg-gray-300 rounded"></div>
                      <div className="w-12 h-4 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No header</div>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Page Content
              </div>
              <div className="bg-white border border-gray-300 p-4 rounded h-32 flex items-center justify-center">
                <div className="text-sm text-gray-500">
                  Page content goes here
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Footer
              </div>
              <div className="bg-white border border-gray-300 p-4 rounded">
                {layout.footer.showFooter ? (
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Footer ({layout.footer.footerStyle})
                    </div>
                    <div className="flex gap-2">
                      <div className="flex-1 h-4 bg-gray-300 rounded"></div>
                      <div className="flex-1 h-4 bg-gray-300 rounded"></div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No footer</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
