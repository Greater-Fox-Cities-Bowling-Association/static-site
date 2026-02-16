import { useState, useEffect } from "react";
import { fetchPagesDirectory, deletePageFile } from "../../utils/githubApi";
import { hasDraft } from "../../utils/draftStore";
import type { PageContent } from "../../types/cms";

interface PageListProps {
  token: string;
  onEdit: (slug: string) => void;
  onCreateNew: () => void;
}

interface PageListItem {
  slug: string;
  title: string;
  status: "draft" | "published";
  hasDraft: boolean;
  updatedAt: string | undefined;
}

export default function PageList({
  token,
  onEdit,
  onCreateNew,
}: PageListProps) {
  const [pages, setPages] = useState<PageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadPages = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log(token);
      const result = await fetchPagesDirectory(token);

      if (!result.success) {
        setError(result.error || "Failed to load pages");
        setPages([]);
        return;
      }

      const files = result.files || [];

      // Fetch content for each page
      const pageItems: PageListItem[] = await Promise.all(
        files.map(async (file) => {
          const slug = file.name.replace(".json", "");

          try {
            // In dev mode, fetch from local path, in production from download_url
            let content: PageContent;

            if (file.download_url && file.download_url.startsWith("/src/")) {
              // Dev mode: Use dynamic import
              const module = await import(`../../content/pages/${file.name}`);
              content = module.default;
            } else if (file.download_url) {
              // Production mode: Fetch from GitHub
              const response = await fetch(file.download_url);
              content = await response.json();
            } else {
              throw new Error("No download URL available");
            }

            return {
              slug,
              title: content.title || slug,
              status: content.status || "published",
              hasDraft: hasDraft(slug),
              updatedAt: content.updatedAt,
            };
          } catch (err) {
            console.error(`Error loading page ${slug}:`, err);
            return {
              slug,
              title: slug,
              status: "published" as const,
              hasDraft: hasDraft(slug),
              updatedAt: undefined,
            };
          }
        }),
      );

      setPages(pageItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPages();
  }, [token]);

  const handleDelete = async (slug: string) => {
    if (!deleteConfirm) {
      setDeleteConfirm(slug);
      return;
    }

    if (deleteConfirm !== slug) {
      return;
    }

    try {
      const result = await deletePageFile(slug, token);

      if (result.success) {
        setPages(pages.filter((p) => p.slug !== slug));
        setDeleteConfirm(null);
      } else {
        alert(`Failed to delete: ${result.error}`);
      }
    } catch (err) {
      alert(
        `Error deleting page: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  const filteredPages = pages.filter(
    (page) =>
      page.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      page.slug.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-600">Loading pages...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={loadPages}
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
        <h2 className="text-2xl font-bold text-gray-900">Pages</h2>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          + Create New Page
        </button>
      </div>

      {pages.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search pages..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {filteredPages.length === 0 && pages.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-600 text-lg mb-4">No pages yet</p>
          <button
            onClick={onCreateNew}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Create Your First Page
          </button>
        </div>
      )}

      {filteredPages.length === 0 && pages.length > 0 && (
        <div className="text-center py-8 text-gray-600">
          No pages match your search
        </div>
      )}

      {filteredPages.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Slug
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPages.map((page) => (
                <tr key={page.slug} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900">
                        {page.title}
                      </span>
                      {page.hasDraft && (
                        <span className="ml-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded">
                          Draft
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                    {page.slug}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        page.status === "published"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {page.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => onEdit(page.slug)}
                      className="text-blue-600 hover:text-blue-800 mr-4"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(page.slug)}
                      className={`${
                        deleteConfirm === page.slug
                          ? "text-red-700 font-bold"
                          : "text-red-600 hover:text-red-800"
                      }`}
                    >
                      {deleteConfirm === page.slug
                        ? "Confirm Delete?"
                        : "Delete"}
                    </button>
                    {deleteConfirm === page.slug && (
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="ml-2 text-gray-600 hover:text-gray-800"
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
    </div>
  );
}
