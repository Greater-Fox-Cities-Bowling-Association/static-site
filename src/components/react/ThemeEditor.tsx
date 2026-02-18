import { useState, useEffect } from "react";
import type { Theme } from "../../types/cms";
import { fetchThemeContent, saveThemeFile } from "../../utils/githubApi";
import { useTheme } from "../../utils/useTheme";

interface ThemeEditorProps {
  themeId: string | undefined; // undefined = creating new theme
  token: string;
  onSave: () => void;
  onCancel: () => void;
  useGitHubAPI?: boolean;
}

const GOOGLE_FONTS = [
  "Inter, system-ui, sans-serif",
  "Outfit, sans-serif",
  "Roboto, sans-serif",
  "Open Sans, sans-serif",
  "Lato, sans-serif",
  "Montserrat, sans-serif",
  "Poppins, sans-serif",
  "Raleway, sans-serif",
  "Nunito, sans-serif",
  "Playfair Display, serif",
  "Merriweather, serif",
  "Georgia, serif",
  "system-ui, sans-serif",
];

function generateThemeId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createEmptyTheme(): Theme {
  return {
    id: "",
    name: "",
    description: "",
    isActive: false,
    colors: {
      primary: "#2563eb",
      secondary: "#64748b",
      background: "#ffffff",
      text: "#1f2937",
      textSecondary: "#6b7280",
      accent: "#3b82f6",
    },
    fonts: {
      heading: "Outfit, sans-serif",
      body: "Inter, system-ui, sans-serif",
    },
  };
}

export default function ThemeEditor({
  themeId,
  token,
  onSave,
  onCancel,
  useGitHubAPI = false,
}: ThemeEditorProps) {
  const { colors: themeColors } = useTheme();
  const [theme, setTheme] = useState<Theme>(createEmptyTheme());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const owner =
    import.meta.env.PUBLIC_GITHUB_OWNER || import.meta.env.GITHUB_OWNER || "";
  const repo =
    import.meta.env.PUBLIC_GITHUB_REPO || import.meta.env.GITHUB_REPO || "";

  const isCreating = !themeId;

  useEffect(() => {
    if (themeId) {
      loadTheme();
    } else {
      setLoading(false);
    }
  }, [themeId]);

  const loadTheme = async () => {
    if (!themeId) return;

    setLoading(true);
    setError(null);

    try {
      const loadedTheme = await fetchThemeContent(
        themeId,
        token,
        owner,
        repo,
        useGitHubAPI,
      );
      setTheme(loadedTheme);
    } catch (err) {
      console.error("Error loading theme:", err);
      setError(err instanceof Error ? err.message : "Failed to load theme");
    } finally {
      setLoading(false);
    }
  };

  const validateTheme = (): boolean => {
    const errors: Record<string, string> = {};

    if (!theme.name.trim()) {
      errors.name = "Theme name is required";
    }

    if (!theme.colors.primary) {
      errors.primary = "Primary color is required";
    }

    if (!theme.colors.background) {
      errors.background = "Background color is required";
    }

    if (!theme.colors.text) {
      errors.text = "Text color is required";
    }

    if (!theme.fonts.heading) {
      errors.headingFont = "Heading font is required";
    }

    if (!theme.fonts.body) {
      errors.bodyFont = "Body font is required";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateTheme()) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const themeToSave: Theme = {
        ...theme,
        id: isCreating ? generateThemeId(theme.name) : theme.id,
        updatedAt: new Date().toISOString(),
        createdAt: theme.createdAt || new Date().toISOString(),
      };

      await saveThemeFile(themeToSave, token, owner, repo, useGitHubAPI);
      onSave();
    } catch (err) {
      console.error("Error saving theme:", err);
      setError(err instanceof Error ? err.message : "Failed to save theme");
      setSaving(false);
    }
  };

  const updateTheme = (updates: Partial<Theme>) => {
    setTheme((prev) => ({ ...prev, ...updates }));
  };

  const updateColors = (colorUpdates: Partial<Theme["colors"]>) => {
    setTheme((prev) => ({
      ...prev,
      colors: { ...prev.colors, ...colorUpdates },
    }));
  };

  const updateFonts = (fontUpdates: Partial<Theme["fonts"]>) => {
    setTheme((prev) => ({
      ...prev,
      fonts: { ...prev.fonts, ...fontUpdates },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div
            style={{ borderBottomColor: themeColors.primary }}
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
          ></div>
          <p style={{ color: themeColors.textSecondary }}>Loading theme...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2
            style={{ color: themeColors.text }}
            className="text-2xl font-bold"
          >
            {isCreating ? "Create New Theme" : `Edit Theme: ${theme.name}`}
          </h2>
          <p style={{ color: themeColors.textSecondary }} className="mt-1">
            {isCreating
              ? "Design a new theme for your site"
              : "Modify the theme settings"}
          </p>
        </div>
        <button
          onClick={onCancel}
          style={{
            color: themeColors.textSecondary,
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor =
              themeColors.secondary + "15";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
          className="px-4 py-2 rounded-lg transition-colors"
        >
          Cancel
        </button>
      </div>

      {error && (
        <div
          style={{ backgroundColor: "#fee2e2", borderColor: "#fecaca" }}
          className="border rounded-lg p-4"
        >
          <p style={{ color: "#991b1b" }}>{error}</p>
        </div>
      )}

      <div
        style={{
          backgroundColor: themeColors.background,
          borderColor: themeColors.secondary,
        }}
        className="rounded-lg border p-6 space-y-6"
      >
        {/* Basic Info */}
        <div className="space-y-4">
          <h3
            style={{ color: themeColors.text }}
            className="text-lg font-semibold"
          >
            Basic Information
          </h3>

          <div>
            <label
              style={{ color: themeColors.text }}
              className="block text-sm font-medium mb-1"
            >
              Theme Name *
            </label>
            <input
              type="text"
              value={theme.name}
              onChange={(e) => updateTheme({ name: e.target.value })}
              style={{
                borderColor: validationErrors.name
                  ? "#ef4444"
                  : themeColors.secondary,
                backgroundColor: themeColors.background,
                color: themeColors.text,
              }}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:border-opacity-100"
              placeholder="My Awesome Theme"
            />
            {validationErrors.name && (
              <p style={{ color: "#dc2626" }} className="text-sm mt-1">
                {validationErrors.name}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Description
            </label>
            <textarea
              value={theme.description || ""}
              onChange={(e) => updateTheme({ description: e.target.value })}
              className="w-full px-3 py-2 border border-text/20 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
              rows={2}
              placeholder="Describe your theme..."
            />
          </div>
        </div>

        {/* Colors */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold text-text">Colors</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Primary Color *
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.colors.primary}
                  onChange={(e) => updateColors({ primary: e.target.value })}
                  className="h-10 w-14 rounded border border-text/20 cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.colors.primary}
                  onChange={(e) => updateColors({ primary: e.target.value })}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                    validationErrors.primary
                      ? "border-red-500"
                      : "border-text/20"
                  }`}
                  placeholder="#2563eb"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Secondary Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.colors.secondary}
                  onChange={(e) => updateColors({ secondary: e.target.value })}
                  className="h-10 w-14 rounded border border-text/20 cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.colors.secondary}
                  onChange={(e) => updateColors({ secondary: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#64748b"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Background Color *
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.colors.background}
                  onChange={(e) => updateColors({ background: e.target.value })}
                  className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.colors.background}
                  onChange={(e) => updateColors({ background: e.target.value })}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.background
                      ? "border-red-300"
                      : "border-gray-300"
                  }`}
                  placeholder="#ffffff"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Text Color *
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.colors.text}
                  onChange={(e) => updateColors({ text: e.target.value })}
                  className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.colors.text}
                  onChange={(e) => updateColors({ text: e.target.value })}
                  className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    validationErrors.text ? "border-red-300" : "border-gray-300"
                  }`}
                  placeholder="#1f2937"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Secondary Text Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.colors.textSecondary || "#6b7280"}
                  onChange={(e) =>
                    updateColors({ textSecondary: e.target.value })
                  }
                  className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.colors.textSecondary || ""}
                  onChange={(e) =>
                    updateColors({ textSecondary: e.target.value })
                  }
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#6b7280"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Accent Color
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={theme.colors.accent || "#3b82f6"}
                  onChange={(e) => updateColors({ accent: e.target.value })}
                  className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={theme.colors.accent || ""}
                  onChange={(e) => updateColors({ accent: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="#3b82f6"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Fonts */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold text-text">Typography</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Heading Font *
              </label>
              <select
                value={theme.fonts.heading}
                onChange={(e) => updateFonts({ heading: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                  validationErrors.headingFont
                    ? "border-red-500"
                    : "border-text/20"
                }`}
              >
                {GOOGLE_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
              {validationErrors.headingFont && (
                <p className="text-red-600 text-sm mt-1">
                  {validationErrors.headingFont}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Body Font *
              </label>
              <select
                value={theme.fonts.body}
                onChange={(e) => updateFonts({ body: e.target.value })}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary ${
                  validationErrors.bodyFont
                    ? "border-red-500"
                    : "border-text/20"
                }`}
              >
                {GOOGLE_FONTS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
              {validationErrors.bodyFont && (
                <p className="text-red-600 text-sm mt-1">
                  {validationErrors.bodyFont}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="space-y-4 border-t pt-6">
          <h3 className="text-lg font-semibold text-text">Preview</h3>

          <div
            className="rounded-lg border p-6 space-y-4"
            style={{
              backgroundColor: theme.colors.background,
              color: theme.colors.text,
            }}
          >
            <h4
              className="text-2xl font-bold"
              style={{ fontFamily: theme.fonts.heading }}
            >
              Sample Heading
            </h4>
            <p style={{ fontFamily: theme.fonts.body }}>
              This is sample body text to preview how your theme will look. The
              quick brown fox jumps over the lazy dog.
            </p>
            <button
              className="px-4 py-2 rounded-lg font-medium"
              style={{
                backgroundColor: theme.colors.primary,
                color: theme.colors.background,
              }}
            >
              Primary Button
            </button>
            <p
              className="text-sm"
              style={{
                color: theme.colors.textSecondary || theme.colors.text,
                fontFamily: theme.fonts.body,
              }}
            >
              Secondary text color is used for less important information.
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between gap-4 bg-background border border-text/10 rounded-lg p-4">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-text/20 rounded-lg hover:bg-primary/5 transition-colors font-medium"
          disabled={saving}
        >
          Cancel
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-primary text-background rounded-lg hover:bg-accent transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving..." : isCreating ? "Create Theme" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
