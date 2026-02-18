import { useState, useEffect } from "react";
import type { Theme } from "../../types/cms";
import { useTheme } from "../../utils/useTheme";
import {
  fetchThemesDirectory,
  fetchThemeContent,
  deleteThemeFile,
  activateTheme,
} from "../../utils/githubApi";

interface ThemeListProps {
  token: string;
  onEditTheme: (themeId: string) => void;
  onCreateNewTheme: () => void;
  useGitHubAPI?: boolean;
}

export default function ThemeList({
  token,
  onEditTheme,
  onCreateNewTheme,
  useGitHubAPI = false,
}: ThemeListProps) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activating, setActivating] = useState<string | null>(null);

  // Use theme colors for styling
  const { colors, fonts } = useTheme();

  const owner =
    import.meta.env.PUBLIC_GITHUB_OWNER || import.meta.env.GITHUB_OWNER || "";
  const repo =
    import.meta.env.PUBLIC_GITHUB_REPO || import.meta.env.GITHUB_REPO || "";

  useEffect(() => {
    loadThemes();
  }, [token, useGitHubAPI]);

  const loadThemes = async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchThemesDirectory(
        token,
        owner,
        repo,
        useGitHubAPI,
      );

      if (!result.success || !result.files) {
        setError(result.error || "Failed to load themes");
        return;
      }

      const themePromises = result.files.map(async (file) => {
        const themeId = file.name.replace(".json", "");
        const theme = await fetchThemeContent(
          themeId,
          token,
          owner,
          repo,
          useGitHubAPI,
        );
        return theme;
      });

      const loadedThemes = await Promise.all(themePromises);
      setThemes(loadedThemes);
    } catch (err) {
      console.error("Error loading themes:", err);
      setError(err instanceof Error ? err.message : "Failed to load themes");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (themeId: string) => {
    if (!confirm(`Are you sure you want to delete the theme "${themeId}"?`)) {
      return;
    }

    // Prevent deleting the active theme
    const theme = themes.find((t) => t.id === themeId);
    if (theme?.isActive) {
      alert(
        "Cannot delete the active theme. Please activate a different theme first.",
      );
      return;
    }

    setDeleting(themeId);

    try {
      await deleteThemeFile(themeId, token, owner, repo, useGitHubAPI);
      await loadThemes();
    } catch (err) {
      console.error("Error deleting theme:", err);
      alert(err instanceof Error ? err.message : "Failed to delete theme");
    } finally {
      setDeleting(null);
    }
  };

  const handleActivate = async (themeId: string) => {
    setActivating(themeId);

    try {
      await activateTheme(themeId, token, owner, repo, useGitHubAPI);
      await loadThemes();
      // Reload the page after successful activation to apply the new theme
      if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch (err) {
      console.error("Error activating theme:", err);
      alert(err instanceof Error ? err.message : "Failed to activate theme");
    } finally {
      setActivating(null);
    }
  };

  const activeTheme = themes.find((t) => t.isActive);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading themes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={loadThemes}
          className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2
            className="text-2xl font-bold"
            style={{ color: colors.text, fontFamily: fonts.heading }}
          >
            Themes
          </h2>
          <p
            className="mt-1"
            style={{ color: colors.textSecondary, fontFamily: fonts.body }}
          >
            Manage site-wide themes and color schemes
          </p>
        </div>
        <button
          onClick={onCreateNewTheme}
          className="px-4 py-2 rounded-lg transition-colors font-medium"
          style={{
            backgroundColor: colors.primary,
            color: "#ffffff",
          }}
        >
          + Create Theme
        </button>
      </div>

      {activeTheme && (
        <div
          className="rounded-lg p-4"
          style={{
            backgroundColor: `${colors.primary}15`,
            borderColor: colors.primary,
            borderWidth: "1px",
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold" style={{ color: colors.primary }}>
                Active Theme
              </h3>
              <p className="mt-1" style={{ color: colors.primary }}>
                {activeTheme.name}
              </p>
              {activeTheme.description && (
                <p
                  className="text-sm mt-1"
                  style={{ color: colors.textSecondary }}
                >
                  {activeTheme.description}
                </p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-1">
                {Object.entries(activeTheme.colors)
                  .slice(0, 4)
                  .map(([key, value]) => (
                    <div
                      key={key}
                      className="w-8 h-8 rounded border border-gray-300 shadow-sm"
                      style={{ backgroundColor: value }}
                      title={`${key}: ${value}`}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {themes.length === 0 ? (
          <div
            className="text-center py-12 rounded-lg border-2 border-dashed"
            style={{
              backgroundColor: colors.background,
              borderColor: colors.secondary,
            }}
          >
            <p className="mb-4" style={{ color: colors.textSecondary }}>
              No themes found
            </p>
            <button
              onClick={onCreateNewTheme}
              style={{ color: colors.primary }}
              className="font-medium hover:underline"
            >
              Create your first theme
            </button>
          </div>
        ) : (
          themes.map((theme) => (
            <div
              key={theme.id}
              className="rounded-lg p-4 transition-all"
              style={{
                backgroundColor: colors.background,
                borderColor: theme.isActive ? colors.primary : colors.secondary,
                borderWidth: "1px",
                boxShadow: theme.isActive
                  ? `0 4px 6px rgba(0,0,0,0.1)`
                  : "none",
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className="text-lg font-semibold"
                      style={{ color: colors.text }}
                    >
                      {theme.name}
                    </h3>
                    {theme.isActive && (
                      <span
                        className="px-2 py-1 text-xs font-medium rounded"
                        style={{
                          backgroundColor: colors.primary + "25",
                          color: colors.primary,
                        }}
                      >
                        Active
                      </span>
                    )}
                  </div>
                  {theme.description && (
                    <p
                      style={{ color: colors.textSecondary }}
                      className="text-sm mt-1"
                    >
                      {theme.description}
                    </p>
                  )}

                  <div className="mt-3 space-y-2">
                    <div>
                      <p
                        style={{ color: colors.textSecondary }}
                        className="text-xs font-medium mb-1"
                      >
                        Colors
                      </p>
                      <div className="flex gap-1 flex-wrap">
                        {Object.entries(theme.colors).map(([key, value]) => (
                          <div
                            key={key}
                            className="w-10 h-10 rounded shadow-sm relative group"
                            style={{
                              backgroundColor: value,
                              borderColor: colors.secondary,
                              borderWidth: "1px",
                            }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                              {key}: {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p
                        style={{ color: colors.textSecondary }}
                        className="text-xs font-medium mb-1"
                      >
                        Fonts
                      </p>
                      <div
                        style={{ color: colors.text }}
                        className="text-sm space-y-1"
                      >
                        <div>
                          <span className="font-medium">Heading:</span>{" "}
                          {theme.fonts.heading}
                        </div>
                        <div>
                          <span className="font-medium">Body:</span>{" "}
                          {theme.fonts.body}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => onEditTheme(theme.id)}
                    style={{
                      color: colors.primary,
                      backgroundColor: "transparent",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor =
                        colors.primary + "10";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                    className="px-3 py-1 rounded transition-colors text-sm font-medium"
                  >
                    Edit
                  </button>

                  {!theme.isActive && (
                    <button
                      onClick={() => handleActivate(theme.id)}
                      disabled={activating === theme.id}
                      style={{
                        color: "#16a34a",
                        backgroundColor: "transparent",
                        opacity: activating === theme.id ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (activating !== theme.id) {
                          e.currentTarget.style.backgroundColor = "#16a34a10";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                      className="px-3 py-1 rounded transition-colors text-sm font-medium disabled:cursor-not-allowed"
                    >
                      {activating === theme.id ? "Activating..." : "Activate"}
                    </button>
                  )}

                  {!theme.isActive && (
                    <button
                      onClick={() => handleDelete(theme.id)}
                      disabled={deleting === theme.id}
                      style={{
                        color: "#dc2626",
                        backgroundColor: "transparent",
                        opacity: deleting === theme.id ? 0.5 : 1,
                      }}
                      onMouseEnter={(e) => {
                        if (deleting !== theme.id) {
                          e.currentTarget.style.backgroundColor = "#dc262610";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                      className="px-3 py-1 rounded transition-colors text-sm font-medium disabled:cursor-not-allowed"
                    >
                      {deleting === theme.id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
