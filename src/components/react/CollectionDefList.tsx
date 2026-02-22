import { useState, useEffect } from "react";
import {
  fetchCollectionDefs,
  deleteCollectionDef,
} from "../../utils/githubApi";
import type { CollectionDef } from "../../types/cms";

interface CollectionDefListProps {
  token: string;
  onEdit: (defId: string) => void;
  onCreate: () => void;
  useGitHubAPI?: boolean;
}

export default function CollectionDefList({
  token,
  onEdit,
  onCreate,
  useGitHubAPI = false,
}: CollectionDefListProps) {
  const [defs, setDefs] = useState<CollectionDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadDefs = () => {
    setLoading(true);
    setLoadError(null);
    fetchCollectionDefs(token, undefined, undefined, useGitHubAPI)
      .then((result) => {
        if (result.success) {
          setDefs((result.defs ?? []) as CollectionDef[]);
        } else {
          setLoadError(result.error ?? "Failed to load collection types");
        }
      })
      .catch((err: Error) => setLoadError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDefs();
  }, [token, useGitHubAPI]);

  const handleDelete = async (def: CollectionDef) => {
    if (
      !confirm(
        `Delete the "${def.name}" collection type? This cannot be undone.`,
      )
    )
      return;
    setDeleting(def.id);
    try {
      await deleteCollectionDef(
        def.id,
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );
      setDefs((prev) => prev.filter((d) => d.id !== def.id));
    } catch (err) {
      alert(
        `Failed to delete: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-text-secondary">Loading collection types...</div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-700 mb-3">{loadError}</p>
        <button
          onClick={loadDefs}
          className="px-4 py-2 bg-primary text-background rounded-lg text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-text">Collection Types</h2>
          <p className="text-sm text-text-secondary mt-1">
            Define custom data structures for your site's collections.
          </p>
        </div>
        <button
          onClick={onCreate}
          className="px-5 py-2 bg-primary text-background rounded-lg font-medium hover:bg-accent"
        >
          + New Collection Type
        </button>
      </div>

      {defs.length === 0 ? (
        <div className="text-center py-16 bg-background border border-text/10 rounded-lg">
          <div className="text-5xl mb-4">🗂️</div>
          <h3 className="text-xl font-semibold text-text mb-2">
            No collection types yet
          </h3>
          <p className="text-text-secondary mb-6">
            Create your first collection type to start storing structured data.
          </p>
          <button
            onClick={onCreate}
            className="px-6 py-3 bg-primary text-background rounded-lg font-medium hover:bg-accent"
          >
            Create First Collection Type
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {defs.map((def) => (
            <div
              key={def.id}
              className="bg-background border border-text/10 rounded-lg p-5 hover:border-primary/40 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="text-3xl">{def.icon ?? "📁"}</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => onEdit(def.id)}
                    className="px-3 py-1 text-xs border border-text/20 rounded hover:bg-primary/10 text-text"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(def)}
                    disabled={deleting === def.id}
                    className="px-3 py-1 text-xs border border-red-200 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
                  >
                    {deleting === def.id ? "…" : "Delete"}
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-text">{def.name}</h3>
              <p className="text-xs text-text-secondary font-mono mb-1">
                {def.id}
              </p>
              {def.description && (
                <p className="text-sm text-text-secondary">{def.description}</p>
              )}
              <p className="text-xs text-text-secondary/60 mt-2">
                {def.fields.length} field{def.fields.length !== 1 ? "s" : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
