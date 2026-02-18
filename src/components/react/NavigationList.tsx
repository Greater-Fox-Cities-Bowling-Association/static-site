import { useState, useEffect } from "react";
import type { NavigationConfig } from "../../types/cms";
import { useTheme } from "../../utils/useTheme";

interface NavigationListProps {
  token: string;
  onEdit: (navigationId: string) => void;
  useGitHubAPI?: boolean;
}

export default function NavigationList({
  token,
  onEdit,
  useGitHubAPI = false,
}: NavigationListProps) {
  const { colors } = useTheme();
  const [navigations, setNavigations] = useState<NavigationConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNavigations();
  }, []);

  const loadNavigations = async () => {
    setLoading(true);
    setError(null);

    try {
      // For now, we'll just load the default navigation
      // In the future, this could be expanded to support multiple navigation configs
      const module = await import("../../content/navigation/default.json");
      setNavigations([module.default]);
    } catch (err) {
      setError("Failed to load navigation configurations");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p style={{ color: colors.textSecondary }}>Loading navigations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 style={{ color: colors.text }} className="text-2xl font-bold mb-2">
          Navigation Menus
        </h2>
        <p style={{ color: colors.textSecondary }} className="text-sm">
          Configure the navigation menus for your website. Support for dropdown
          menus with submenu items.
        </p>
      </div>

      <div className="space-y-4">
        {navigations.map((nav) => (
          <div
            key={nav.id}
            className="p-6 bg-background border border-text/10 rounded-lg hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3
                  style={{ color: colors.text }}
                  className="text-lg font-semibold mb-1"
                >
                  {nav.name}
                </h3>
                {nav.description && (
                  <p
                    style={{ color: colors.textSecondary }}
                    className="text-sm mb-3"
                  >
                    {nav.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  {nav.items.map((item) => (
                    <span
                      key={item.id}
                      className="px-2 py-1 text-xs bg-primary/10 text-primary rounded"
                    >
                      {item.label}
                      {item.children && item.children.length > 0 && (
                        <span className="ml-1 opacity-70">
                          ({item.children.length})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
                {nav.updatedAt && (
                  <p
                    style={{ color: colors.textSecondary }}
                    className="text-xs mt-3"
                  >
                    Last updated: {new Date(nav.updatedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
              <button
                onClick={() => onEdit(nav.id)}
                style={{
                  backgroundColor: colors.primary,
                  color: colors.background,
                }}
                className="px-4 py-2 rounded-md hover:opacity-90 transition-opacity text-sm ml-4"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-900 mb-2">
          💡 Dropdown Navigation Tips
        </h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Add child items to create dropdown menus</li>
          <li>
            • Items appear in the order specified - use arrow buttons to reorder
          </li>
          <li>
            • Leave href blank for items that only serve as dropdown parents
          </li>
          <li>
            • Desktop shows dropdowns on hover, mobile shows expandable menus
          </li>
        </ul>
      </div>
    </div>
  );
}
