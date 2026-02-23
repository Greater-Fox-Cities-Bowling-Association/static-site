import { useState, useEffect } from "react";
import type { CompositeComponent, PrimitiveComponent } from "../../types/cms";
import {
  fetchCompositeComponents,
  fetchPrimitiveComponents,
  deleteCompositeComponent,
} from "../../utils/githubApi";

interface ComponentListProps {
  token: string;
  onEditComposite: (componentId: string) => void;
  onCreateComposite: () => void;
  onEditPrimitive: (componentId: string) => void;
  onCreatePrimitive: () => void;
  useGitHubAPI: boolean;
}

export default function ComponentList({
  token,
  onEditComposite,
  onCreateComposite,
  onEditPrimitive,
  onCreatePrimitive,
  useGitHubAPI,
}: ComponentListProps) {
  const [composites, setComposites] = useState<CompositeComponent[]>([]);
  const [primitives, setPrimitives] = useState<PrimitiveComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"composites" | "primitives">(
    "composites",
  );
  const [deleting, setDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<CompositeComponent | null>(
    null,
  );
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    loadComponents();
  }, [token, useGitHubAPI]);

  const loadComponents = async () => {
    setLoading(true);
    setError(null);
    try {
      const [compositesData, primitivesData] = await Promise.all([
        fetchCompositeComponents(token, undefined, undefined, useGitHubAPI),
        fetchPrimitiveComponents(token, undefined, undefined, useGitHubAPI),
      ]);
      setComposites(compositesData);
      setPrimitives(primitivesData);
    } catch (err) {
      console.error("Error loading components:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load components",
      );
    } finally {
      setLoading(false);
    }
  };

  /** Returns names of composites that embed the given composite ID */
  const getDependents = (id: string): string[] =>
    composites
      .filter(
        (c) =>
          c.id !== id &&
          c.components.some(
            (inst) => inst.kind === "composite" && inst.composite === id,
          ),
      )
      .map((c) => c.name);

  const handleDeleteClick = (
    e: React.MouseEvent,
    composite: CompositeComponent,
  ) => {
    e.stopPropagation();
    setDeleteError(null);
    const dependents = getDependents(composite.id);
    if (dependents.length > 0) {
      setDeleteError(
        `Cannot delete "${composite.name}" — it is used by: ${dependents.join(", ")}. Remove it from those composites first.`,
      );
      return;
    }
    setConfirmDelete(composite);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(confirmDelete.id);
    setConfirmDelete(null);
    try {
      const result = await deleteCompositeComponent(
        confirmDelete.id,
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );
      if (!result.success) {
        setDeleteError(result.error ?? "Failed to delete component");
      } else {
        setComposites((prev) => prev.filter((c) => c.id !== confirmDelete.id));
      }
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Failed to delete component",
      );
    } finally {
      setDeleting(null);
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
            Manage primitives (building blocks) and composites (assembled
            layouts)
          </p>
        </div>
        <button
          onClick={
            activeTab === "composites" ? onCreateComposite : onCreatePrimitive
          }
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {activeTab === "composites"
            ? "+ Create Composite"
            : "+ Create Primitive"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab("composites")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "composites"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Composites ({composites.length})
        </button>
        <button
          onClick={() => setActiveTab("primitives")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "primitives"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Primitives ({primitives.length})
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start justify-between gap-3">
          <p className="text-red-800 text-sm">{deleteError}</p>
          <button
            onClick={() => setDeleteError(null)}
            className="text-red-400 hover:text-red-600 shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Delete Component
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete{" "}
              <strong>{confirmDelete.name}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Composites tab */}
      {activeTab === "composites" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {composites.map((composite) => {
              const primitiveCount = composite.components.filter(
                (c) => c.kind !== "composite",
              ).length;
              const compositeCount = composite.components.filter(
                (c) => c.kind === "composite",
              ).length;
              const isDeleting = deleting === composite.id;
              return (
                <div
                  key={composite.id}
                  className={`border rounded-lg p-4 transition-colors relative ${
                    isDeleting
                      ? "border-gray-200 opacity-50 pointer-events-none"
                      : "border-gray-200 hover:border-blue-400 cursor-pointer"
                  }`}
                  onClick={() => !isDeleting && onEditComposite(composite.id)}
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
                    <button
                      onClick={(e) => handleDeleteClick(e, composite)}
                      disabled={isDeleting}
                      title="Delete component"
                      className="text-gray-300 hover:text-red-500 transition-colors text-sm px-1 disabled:opacity-30"
                    >
                      🗑
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {composite.description}
                  </p>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    {primitiveCount > 0 && (
                      <span>
                        {primitiveCount} primitive
                        {primitiveCount !== 1 ? "s" : ""}
                      </span>
                    )}
                    {compositeCount > 0 && (
                      <>
                        {primitiveCount > 0 && <span>•</span>}
                        <span className="text-purple-600">
                          {compositeCount} composite
                          {compositeCount !== 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                    <span>•</span>
                    <span>
                      {composite.dataSchema.length} field
                      {composite.dataSchema.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          {composites.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500 mb-4">No composites created yet</p>
              <button
                onClick={onCreateComposite}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first composite
              </button>
            </div>
          )}
        </>
      )}

      {/* Primitives tab */}
      {activeTab === "primitives" && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {primitives.map((primitive) => (
              <div
                key={primitive.id}
                className="border border-gray-200 hover:border-blue-400 cursor-pointer rounded-lg p-4 transition-colors"
                onClick={() => onEditPrimitive(primitive.id)}
              >
                <div className="flex items-center gap-2 mb-2">
                  {primitive.icon && (
                    <span className="text-2xl">{primitive.icon}</span>
                  )}
                  <h3 className="font-semibold text-gray-900">
                    {primitive.name}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {primitive.description}
                </p>
                <div className="text-xs text-gray-500">
                  {primitive.fields.length} field
                  {primitive.fields.length !== 1 ? "s" : ""}
                  {primitive.styles &&
                    Object.values(primitive.styles).some(Boolean) && (
                      <span className="ml-2 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                        styled
                      </span>
                    )}
                </div>
              </div>
            ))}
          </div>
          {primitives.length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
              <p className="text-gray-500 mb-4">No primitives found</p>
              <button
                onClick={onCreatePrimitive}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Create your first primitive
              </button>
            </div>
          )}
        </>
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
              or <strong>other composites</strong> into reusable patterns.
              Components with dependents cannot be deleted until those
              dependencies are removed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
