import { useState, useEffect } from "react";
import {
  fetchLayoutsDirectory,
  deleteLayoutFile,
  fetchLayoutContent,
} from "../../utils/githubApi";
import type { Layout } from "../../types/cms";

interface LayoutListProps {
  token: string;
  onEdit: (layoutId: string) => void;
  onCreateNew: () => void;
  useGitHubAPI?: boolean;
}

interface LayoutListItem {
  id: string;
  name: string;
  description: string;
  updatedAt: string | undefined;
}

export default function LayoutList({
  token,
  onEdit,
  onCreateNew,
  useGitHubAPI = false,
}: LayoutListProps) {
  const [layouts, setLayouts] = useState<LayoutListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadLayouts = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchLayoutsDirectory(
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );

      if (!result.success) {
        setError(result.error || "Failed to load layouts");
        setLayouts([]);
        return;
      }

      const files = result.files || [];

      // Fetch content for each layout
      const layoutItems: LayoutListItem[] = await Promise.all(
        files.map(async (file) => {
          const layoutId = file.name.replace(".json", "");

          try {
            let content: Layout;

            if (file.download_url && file.download_url.startsWith("/src/")) {
              // Dev mode: Use dynamic import
              const module = await import(`../../content/layouts/${file.name}`);
              content = module.default;
            } else if (file.download_url) {
              // Production mode: Fetch from GitHub
              const response = await fetch(file.download_url);
              content = await response.json();
            } else {
              // Use GitHub API
              const fetchResult = await fetchLayoutContent(
                layoutId,
                token,
                undefined,
                undefined,
                useGitHubAPI,
              );
              if (!fetchResult.success || !fetchResult.content) {
                throw new Error("Failed to fetch layout");
              }
              content = fetchResult.content;
            }

            return {
              id: layoutId,
              name: content.name || layoutId,
              description: content.description || "",
              updatedAt: content.updatedAt,
            };
          } catch (err) {
            console.error(`Error loading layout ${layoutId}:`, err);
            return {
              id: layoutId,
              name: layoutId,
              description: "",
              updatedAt: undefined,
            };
          }
        }),
      );

      setLayouts(layoutItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLayouts();
  }, [token, useGitHubAPI]);

  const handleDelete = async (layoutId: string) => {
    if (!deleteConfirm) {
      setDeleteConfirm(layoutId);
      return;
    }

    if (deleteConfirm !== layoutId) {
      return;
    }

    try {
      const result = await deleteLayoutFile(
        layoutId,
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );

      if (result.success) {
        setLayouts(layouts.filter((l) => l.id !== layoutId));
        setDeleteConfirm(null);
      } else {
        alert(`Failed to delete: ${result.error}`);
      }
    } catch (err) {
      alert(
        `Error deleting layout: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const filteredLayouts = layouts.filter(
    (layout) =>
      layout.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      layout.id.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading layouts...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={loadLayouts}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Layouts</h2>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + Create New Layout
        </button>
      </div>

      {layouts.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search layouts..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {filteredLayouts.length === 0 && layouts.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 text-lg mb-4">No layouts yet</p>
          <button
            onClick={onCreateNew}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Your First Layout
          </button>
        </div>
      )}

      {filteredLayouts.length > 0 && (
        <div className="grid gap-4">
          {filteredLayouts.map((layout) => (
            <div
              key={layout.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {layout.name}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1 font-mono">
                    ID: {layout.id}
                  </p>
                  {layout.description && (
                    <p className="text-sm text-gray-600 mt-2">
                      {layout.description}
                    </p>
                  )}
                  {layout.updatedAt && (
                    <p className="text-xs text-gray-500 mt-3">
                      Last updated:{" "}
                      {new Date(layout.updatedAt).toLocaleDateString()}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(layout.id)}
                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium text-sm transition-colors"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDelete(layout.id)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                      deleteConfirm === layout.id
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "bg-red-50 text-red-600 hover:bg-red-100"
                    }`}
                  >
                    {deleteConfirm === layout.id ? "Confirm Delete?" : "Delete"}
                  </button>

                  {deleteConfirm === layout.id && (
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium text-sm transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {filteredLayouts.length === 0 && layouts.length > 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600">No layouts match your search</p>
        </div>
      )}
    </div>
  );
}
