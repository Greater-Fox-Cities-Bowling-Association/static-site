import { useState, useEffect } from "react";
import {
  CONTENT_COLLECTIONS,
  fetchCollectionDirectory,
  deleteCollectionItem,
} from "../../utils/githubApi";

interface CollectionListProps {
  token: string;
  onEditItem: (collectionName: string, filename: string) => void;
  onCreateItem: (collectionName: string) => void;
  useGitHubAPI?: boolean;
}

interface CollectionMeta {
  name: string;
  itemCount: number;
  icon: string;
  description: string;
}

interface CollectionItem {
  filename: string;
  label: string;
}

const COLLECTION_META: Record<string, { icon: string; description: string }> = {
  centers: { icon: "🎳", description: "Bowling center locations and details" },
  tournaments: { icon: "🏆", description: "Tournament events and schedules" },
  honors: { icon: "🥇", description: "Awards, records, and honorees" },
  news: { icon: "📰", description: "News articles and announcements" },
  committees: { icon: "👥", description: "Committees and their members" },
};

function getPrimaryLabel(data: Record<string, unknown>): string {
  const labelFields = ["title", "name", "category", "role"];
  for (const field of labelFields) {
    if (data[field] && typeof data[field] === "string") {
      return data[field] as string;
    }
  }
  return "(untitled)";
}

export default function CollectionList({
  token,
  onEditItem,
  onCreateItem,
  useGitHubAPI = false,
}: CollectionListProps) {
  const [collections, setCollections] = useState<CollectionMeta[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(
    null,
  );
  const [items, setItems] = useState<CollectionItem[]>([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [loadingItems, setLoadingItems] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Load item counts for all collections
  useEffect(() => {
    loadCollections();
  }, [token, useGitHubAPI]);

  const loadCollections = async () => {
    setLoadingCollections(true);
    setError(null);
    try {
      const results = await Promise.all(
        CONTENT_COLLECTIONS.map(async (name) => {
          const result = await fetchCollectionDirectory(
            name,
            token,
            undefined,
            undefined,
            useGitHubAPI,
          );
          return {
            name,
            itemCount: result.success ? (result.files?.length ?? 0) : 0,
            icon: COLLECTION_META[name]?.icon ?? "📁",
            description:
              COLLECTION_META[name]?.description ?? `${name} collection`,
          };
        }),
      );
      setCollections(results);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load collections",
      );
    } finally {
      setLoadingCollections(false);
    }
  };

  const loadItems = async (collectionName: string) => {
    setLoadingItems(true);
    setItems([]);
    setSearchTerm("");
    setDeleteConfirm(null);
    try {
      const result = await fetchCollectionDirectory(
        collectionName,
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );
      if (!result.success) {
        setError(result.error ?? "Failed to load items");
        return;
      }
      const files = result.files ?? [];

      // Try to get a display label per item
      const itemList: CollectionItem[] = await Promise.all(
        files.map(async (file) => {
          let label = file.name.replace(".json", "");
          try {
            if (
              file.download_url &&
              file.download_url.startsWith("/src/content")
            ) {
              const modules = import.meta.glob("/src/content/**/*.json", {
                eager: false,
              });
              const loader = modules[file.download_url];
              if (loader) {
                const mod = await (loader as () => Promise<unknown>)();
                const data =
                  (mod as { default?: Record<string, unknown> }).default ??
                  (mod as Record<string, unknown>);
                label = getPrimaryLabel(data as Record<string, unknown>);
              }
            } else if (file.download_url) {
              const res = await fetch(file.download_url, {
                headers: { Authorization: `token ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                label = getPrimaryLabel(data);
              }
            }
          } catch {
            // keep filename as label
          }
          return { filename: file.name, label };
        }),
      );
      setItems(itemList);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load collection items",
      );
    } finally {
      setLoadingItems(false);
    }
  };

  const handleSelectCollection = (name: string) => {
    setSelectedCollection(name);
    loadItems(name);
  };

  const handleDelete = async (filename: string) => {
    if (deleteConfirm !== filename) {
      setDeleteConfirm(filename);
      return;
    }
    try {
      const result = await deleteCollectionItem(
        selectedCollection!,
        filename,
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );
      if (result.success) {
        setItems((prev) => prev.filter((i) => i.filename !== filename));
        setCollections((prev) =>
          prev.map((c) =>
            c.name === selectedCollection
              ? { ...c, itemCount: Math.max(0, c.itemCount - 1) }
              : c,
          ),
        );
        setDeleteConfirm(null);
      } else {
        alert(`Delete failed: ${result.error}`);
        setDeleteConfirm(null);
      }
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
      setDeleteConfirm(null);
    }
  };

  const filteredItems = items.filter(
    (item) =>
      item.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.filename.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  // ── Render: collection overview grid ──────────────────────────────────────
  if (!selectedCollection) {
    if (loadingCollections) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">Loading collections...</div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-red-700">Error: {error}</p>
          <button
            onClick={loadCollections}
            className="mt-2 px-4 py-2 bg-red-600 text-background rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      );
    }
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-text">Content Collections</h2>
          <p className="text-sm text-text-secondary mt-1">
            Manage the data items in each content collection.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections.map((coll) => (
            <button
              key={coll.name}
              onClick={() => handleSelectCollection(coll.name)}
              className="p-6 bg-background border border-text/10 rounded-lg hover:border-primary/50 hover:shadow-md transition-all text-left"
            >
              <div className="text-4xl mb-3">{coll.icon}</div>
              <h3 className="font-semibold text-text capitalize mb-1">
                {coll.name}
              </h3>
              <p className="text-sm text-text-secondary mb-3">
                {coll.description}
              </p>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                {coll.itemCount} item{coll.itemCount !== 1 ? "s" : ""}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Render: items within a selected collection ─────────────────────────────
  const collMeta = COLLECTION_META[selectedCollection] ?? {
    icon: "📁",
    description: "",
  };

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setSelectedCollection(null);
              setItems([]);
              setError(null);
            }}
            className="text-text-secondary hover:text-text transition-colors"
            title="Back to collections"
          >
            ← Back
          </button>
          <div>
            <h2 className="text-2xl font-bold text-text flex items-center gap-2">
              <span>{collMeta.icon}</span>
              <span className="capitalize">{selectedCollection}</span>
            </h2>
            <p className="text-sm text-text-secondary">
              {collMeta.description}
            </p>
          </div>
        </div>
        <button
          onClick={() => onCreateItem(selectedCollection)}
          className="px-4 py-2 bg-primary text-background rounded-lg hover:bg-accent font-medium"
        >
          + New Item
        </button>
      </div>

      {loadingItems && (
        <div className="flex items-center justify-center py-12">
          <div className="text-text-secondary">Loading items...</div>
        </div>
      )}

      {error && !loadingItems && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {!loadingItems && !error && items.length === 0 && (
        <div className="text-center py-12 bg-background rounded-lg border-2 border-dashed border-text/20">
          <p className="text-text-secondary text-lg mb-4">
            No items in this collection yet
          </p>
          <button
            onClick={() => onCreateItem(selectedCollection)}
            className="px-6 py-3 bg-primary text-background rounded-lg hover:bg-accent font-medium"
          >
            Add First Item
          </button>
        </div>
      )}

      {!loadingItems && items.length > 0 && (
        <>
          <div className="mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search ${selectedCollection}...`}
              className="w-full px-4 py-2 border border-text/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-text-secondary">
              No items match your search
            </div>
          )}

          {filteredItems.length > 0 && (
            <div className="bg-background border border-text/10 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-background border-b border-text/10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Name / Label
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                      File
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-text/10">
                  {filteredItems.map((item) => (
                    <tr key={item.filename} className="hover:bg-primary/5">
                      <td className="px-6 py-4 font-medium text-text">
                        {item.label}
                      </td>
                      <td className="px-6 py-4 text-sm text-text-secondary font-mono">
                        {item.filename}
                      </td>
                      <td className="px-6 py-4 text-right text-sm space-x-3">
                        <button
                          onClick={() =>
                            onEditItem(selectedCollection, item.filename)
                          }
                          className="text-primary hover:text-accent"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(item.filename)}
                          className={
                            deleteConfirm === item.filename
                              ? "text-red-700 font-bold"
                              : "text-red-600 hover:text-red-700"
                          }
                        >
                          {deleteConfirm === item.filename
                            ? "Confirm Delete?"
                            : "Delete"}
                        </button>
                        {deleteConfirm === item.filename && (
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="text-text-secondary hover:text-text"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
