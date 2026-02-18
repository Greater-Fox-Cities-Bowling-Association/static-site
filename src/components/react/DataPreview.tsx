import { useState } from "react";
import { commitToGitHub, generateFilename } from "../../utils/githubApi";

interface DataPreviewProps {
  data: any;
  collectionType: string;
  filename: string;
  onBack: () => void;
  token: string;
  repo: string;
}

export default function DataPreview({
  data,
  collectionType,
  filename,
  onBack,
  token,
  repo,
}: DataPreviewProps) {
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const jsonContent = JSON.stringify(data, null, 2);
  const generatedFilename =
    collectionType !== "centers" && collectionType !== "tournaments"
      ? generateFilename(collectionType, data, filename)
      : "";

  const handlePublish = async () => {
    setPublishing(true);
    setResult(null);

    try {
      const [owner, repoName] = repo.split("/");

      if (!owner || !repoName) {
        setResult({
          success: false,
          message: "Invalid repository format. Expected: owner/repository",
        });
        setPublishing(false);
        return;
      }

      if (Array.isArray(data)) {
        // Multiple items (centers, tournaments) - create multiple files
        let successCount = 0;
        for (const item of data) {
          const itemFilename = generateFilename(collectionType, item, filename);
          const path = `src/content/${collectionType}/${itemFilename}`;
          const content = JSON.stringify(item, null, 2);

          const response = await commitToGitHub({
            token,
            owner,
            repo: repoName,
            path,
            content,
            message: `Add ${collectionType}: ${itemFilename}`,
          });

          if (response.success) successCount++;
        }

        setResult({
          success: true,
          message: `Successfully published ${successCount} of ${data.length} items!`,
        });
      } else {
        // Single file (honors, complex data)
        const path = `src/content/${collectionType}/${generatedFilename}`;
        const response = await commitToGitHub({
          token,
          owner,
          repo: repoName,
          path,
          content: jsonContent,
          message: `Add ${collectionType}: ${generatedFilename}`,
        });

        if (response.success) {
          setResult({
            success: true,
            message:
              "Successfully published to GitHub! Your site will rebuild automatically.",
          });
        } else {
          setResult({
            success: false,
            message: response.error || "Failed to publish",
          });
        }
      }
    } catch (error) {
      setResult({
        success: false,
        message:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setPublishing(false);
    }
  };

  const getItemCount = () => {
    if (Array.isArray(data)) return data.length;
    if (data.recipients) return data.recipients.length;
    return 1;
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-background rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-text mb-6">Preview Your Data</h2>

        <div className="mb-6 p-4 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-primary">
                Ready to publish
              </h3>
              <div className="mt-2 text-sm text-primary">
                <p>
                  <strong>Type:</strong> {collectionType}
                </p>
                <p>
                  <strong>Items:</strong> {getItemCount()}
                </p>
                {generatedFilename && (
                  <p>
                    <strong>Filename:</strong> {generatedFilename}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">JSON Preview</h3>
          <pre className="bg-secondary text-green-400 p-4 rounded-lg overflow-auto max-h-96 text-sm font-mono">
            {jsonContent}
          </pre>
        </div>

        {result && (
          <div
            className={`mb-6 p-4 rounded-lg border ${
              result.success
                ? "bg-green-500/10 border-green-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}
          >
            <p
              className={`font-medium ${
                result.success ? "text-green-700" : "text-red-700"
              }`}
            >
              {result.success ? "✅" : "⚠️"} {result.message}
            </p>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="px-6 py-3 border border-text/20 rounded-lg font-semibold text-text hover:bg-primary/5 transition-colors"
            disabled={publishing}
          >
            ← Back
          </button>
          <button
            onClick={handlePublish}
            disabled={publishing || result?.success === true}
            className="flex-1 bg-primary text-background py-3 px-6 rounded-lg font-semibold hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {publishing
              ? "Publishing to GitHub..."
              : result?.success
                ? "Published! ✓"
                : "Publish to Website →"}
          </button>
        </div>
      </div>
    </div>
  );
}
