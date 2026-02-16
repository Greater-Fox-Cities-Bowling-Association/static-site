import { useState, useEffect } from "react";
import type { Layout, LayoutHeader, LayoutFooter } from "../../types/cms";
import { fetchLayoutContent, saveLayoutFile } from "../../utils/githubApi";

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

  useEffect(() => {
    if (layoutId) {
      loadLayoutFromGitHub();
    }
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
        <div className="text-gray-600">Loading layout...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {layoutId ? "Edit Layout" : "Create New Layout"}
        </h2>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={handlePublish}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
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
      <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Basic Information</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Layout Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={layout.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Layout ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={layout.id}
              onChange={(e) =>
                updateLayout({ id: generateLayoutId(e.target.value) })
              }
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                errors.id ? "border-red-500" : "border-gray-300"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={layout.description}
              onChange={(e) => updateLayout({ description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {/* Header Configuration */}
      <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg">
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
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
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
      <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg">
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
      <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Layout Preview</h3>
        <div className="bg-gray-50 p-8 rounded-lg border-2 border-dashed border-gray-300">
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
