import { useState, useEffect } from "react";
import type { CompositeComponent } from "../../types/cms";
import { fetchCompositeComponents } from "../../utils/githubApi";

interface ComponentListProps {
  token: string;
  onEditComposite: (componentId: string) => void;
  onCreateComposite: () => void;
  useGitHubAPI: boolean;
}

export default function ComponentList({
  token,
  onEditComposite,
  onCreateComposite,
  useGitHubAPI,
}: ComponentListProps) {
  const [composites, setComposites] = useState<CompositeComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadComponents();
  }, [token, useGitHubAPI]);

  const loadComponents = async () => {
    setLoading(true);
    setError(null);
    try {
      const compositesData = await fetchCompositeComponents(
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );
      setComposites(compositesData);
    } catch (err) {
      console.error("Error loading components:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load components",
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading components...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button
            onClick={loadComponents}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            Component Library
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Create reusable composite components from primitive building blocks
          </p>
        </div>
        <button
          onClick={onCreateComposite}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + Create Component
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {composites.map((composite) => (
          <div
            key={composite.id}
            className="border border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors cursor-pointer"
            onClick={() => onEditComposite(composite.id)}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                {composite.icon && (
                  <span className="text-2xl">{composite.icon}</span>
                )}
                <h3 className="font-semibold text-gray-900">
                  {composite.name}
                </h3>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              {composite.description}
            </p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                {composite.components.length} primitive
                {composite.components.length !== 1 ? "s" : ""}
              </span>
              <span>•</span>
              <span>
                {composite.dataSchema.length} field
                {composite.dataSchema.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        ))}
      </div>

      {composites.length === 0 && (
        <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500 mb-4">No components created yet</p>
          <button
            onClick={onCreateComposite}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first component
          </button>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-xl">💡</div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">
              About Components
            </h4>
            <p className="text-sm text-blue-800">
              Components are built by combining{" "}
              <strong>primitive elements</strong> (text, images, buttons, etc.)
              into reusable patterns like tournament cards or location cards.
              Once created, use them when building pages!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
