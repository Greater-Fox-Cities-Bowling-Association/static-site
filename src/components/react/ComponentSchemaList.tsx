import { useState, useEffect } from "react";
import { getCollections } from "../../utils/githubApi";

interface ComponentSchemaListProps {
  token: string;
  onEdit: (componentName: string) => void;
  onCreateNew: () => void;
  useGitHubAPI: boolean;
}

interface ComponentSchemaInfo {
  name: string;
  itemCount: number;
  fields: string[];
  description?: string;
}

export default function ComponentSchemaList({
  token,
  onEdit,
  onCreateNew,
  useGitHubAPI,
}: ComponentSchemaListProps) {
  const [schemas, setSchemas] = useState<ComponentSchemaInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchemas();
  }, [token, useGitHubAPI]);

  const loadSchemas = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCollections(token, useGitHubAPI);
      setSchemas(data);
    } catch (err) {
      console.error("Error loading component schemas:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load component schemas",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (componentName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete the "${componentName}" component schema? This cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      // TODO: Implement delete functionality
      alert("Delete functionality coming soon!");
    } catch (err) {
      console.error("Error deleting component schema:", err);
      alert("Failed to delete component schema");
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">
            Loading component schemas...
          </span>
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
            onClick={loadSchemas}
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
            Component Schemas
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Define reusable component schemas assembled from primitive
            components
          </p>
        </div>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span className="text-xl">+</span>
          Create Schema
        </button>
      </div>

      {schemas.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">🧩</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Component Schemas Yet
          </h3>
          <p className="text-gray-600 mb-4">
            Create your first component schema to define reusable content
            structures
          </p>
          <button
            onClick={onCreateNew}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Schema
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {schemas.map((schema) => (
            <div
              key={schema.name}
              className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 capitalize">
                    {schema.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {schema.itemCount}{" "}
                    {schema.itemCount === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="text-2xl">🧩</div>
              </div>

              {schema.description && (
                <p className="text-sm text-gray-600 mb-3">
                  {schema.description}
                </p>
              )}

              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500 mb-1">
                  SCHEMA FIELDS
                </p>
                <div className="flex flex-wrap gap-1">
                  {schema.fields.slice(0, 3).map((field) => (
                    <span
                      key={field}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                    >
                      {field}
                    </span>
                  ))}
                  {schema.fields.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                      +{schema.fields.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => onEdit(schema.name)}
                  className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors"
                >
                  Edit Schema
                </button>
                <button
                  onClick={() => handleDelete(schema.name)}
                  className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="text-xl">💡</div>
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">
              About Component Schemas
            </h4>
            <p className="text-sm text-blue-800">
              Component schemas define the structure of reusable content
              components assembled from primitive types. Each schema can have
              custom fields with validation rules. Use them to create different
              content types like honors, tournaments, news, centers, etc. that
              can be displayed in your pages.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
