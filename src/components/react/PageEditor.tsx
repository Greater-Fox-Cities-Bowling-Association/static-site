import { useState, useEffect } from "react";
import type {
  PageContent,
  Section,
  SectionType,
  Layout,
} from "../../types/cms";
import {
  fetchPageContent,
  savePageFile,
  fetchPagesDirectory,
  fetchLayoutsDirectory,
  fetchLayoutContent,
} from "../../utils/githubApi";
import {
  loadDraft,
  saveDraft as saveDraftToStore,
  deleteDraft,
  autoSaveDraft,
} from "../../utils/draftStore";
import { useTheme } from "../../utils/useTheme";
import HeroEditor from "./sections/HeroEditor";
import TextEditor from "./sections/TextEditor";
import CardGridEditor from "./sections/CardGridEditor";
import CtaEditor from "./sections/CtaEditor";
import ContentListEditor from "./sections/ContentListEditor";

interface PageEditorProps {
  slug: string | undefined; // undefined = creating new page
  token: string;
  onSave: () => void;
  onCancel: () => void;
  useGitHubAPI?: boolean;
}

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateSectionId(): string {
  return `section-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function createEmptyPage(): PageContent {
  return {
    slug: "",
    title: "",
    metaDescription: "",
    status: "draft",
    useLayout: true,
    sections: [],
  };
}

function createSection(type: SectionType, order: number): Section {
  const baseSection = {
    id: generateSectionId(),
    type,
    order,
  };

  switch (type) {
    case "hero":
      return { ...baseSection, type: "hero", title: "", subtitle: "" };
    case "text":
      return { ...baseSection, type: "text", content: "" };
    case "cardGrid":
      return { ...baseSection, type: "cardGrid", cards: [], columns: 3 };
    case "cta":
      return {
        ...baseSection,
        type: "cta",
        heading: "",
        buttonText: "",
        buttonLink: "",
        style: "primary",
      };
    case "contentList":
      return {
        ...baseSection,
        type: "contentList",
        collection: "centers",
        displayMode: "cards",
        columns: 3,
      };
  }
}

export default function PageEditor({
  slug,
  token,
  onSave,
  onCancel,
  useGitHubAPI = false,
}: PageEditorProps) {
  const { colors } = useTheme();
  const [page, setPage] = useState<PageContent>(createEmptyPage());
  const [loading, setLoading] = useState(!!slug);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [existingLandingPage, setExistingLandingPage] = useState<string | null>(
    null,
  );
  const [availableLayouts, setAvailableLayouts] = useState<Layout[]>([]);

  useEffect(() => {
    // Check for existing landing page
    checkForLandingPage();

    // Load available layouts
    loadAvailableLayouts();

    if (slug) {
      // Try to load draft first
      const draft = loadDraft(slug);
      if (draft) {
        setPage(draft);
        setHasUnsavedChanges(true);
        setLoading(false);
        return;
      }

      // Load from GitHub
      loadPageFromGitHub();
    }
  }, [slug]);

  useEffect(() => {
    // Auto-save draft when page changes
    if (hasUnsavedChanges && page.slug) {
      autoSaveDraft(page);
    }
  }, [page, hasUnsavedChanges]);

  const checkForLandingPage = async () => {
    try {
      const result = await fetchPagesDirectory(
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );

      if (result.success && result.files) {
        // Check each page for isLandingPage flag
        for (const file of result.files) {
          const pageSlug = file.name.replace(".json", "");
          if (pageSlug === slug) continue; // Skip current page

          const pageResult = await fetchPageContent(
            pageSlug,
            token,
            undefined,
            undefined,
            useGitHubAPI,
          );

          if (pageResult.success && pageResult.content?.isLandingPage) {
            setExistingLandingPage(pageSlug);
            break;
          }
        }
      }
    } catch (error) {
      console.error("Error checking for landing page:", error);
    }
  };

  const loadAvailableLayouts = async () => {
    try {
      // Fetch layouts from GitHub
      const result = await fetchLayoutsDirectory(
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );

      if (result.success && result.files && result.files.length > 0) {
        // Load the content for each layout
        const layouts: Layout[] = await Promise.all(
          result.files.map(async (file) => {
            const layoutId = file.name.replace(".json", "");
            try {
              const contentResult = await fetchLayoutContent(
                layoutId,
                token,
                undefined,
                undefined,
                useGitHubAPI,
              );
              if (contentResult.success && contentResult.content) {
                return contentResult.content;
              }
            } catch (error) {
              console.error(`Failed to load layout ${layoutId}:`, error);
            }
            // Return a default layout if fetch fails
            return {
              id: layoutId,
              name: layoutId,
              description: "",
              header: { showNavigation: true, navigationStyle: "default" },
              footer: { showFooter: true, footerStyle: "default" },
            };
          }),
        );

        setAvailableLayouts(layouts);

        // Auto-default new pages to the first available layout
        if (!slug && layouts.length > 0) {
          setPage((prev) => ({
            ...prev,
            useLayout: true,
            layoutId: layouts?.[0]?.id ?? "",
          }));
        }
      } else {
        // If no layouts found, provide empty array
        setAvailableLayouts([]);
      }
    } catch (error) {
      console.error("Error loading layouts:", error);
      setAvailableLayouts([]);
    }
  };

  const loadPageFromGitHub = async () => {
    if (!slug) return;

    setLoading(true);
    try {
      const result = await fetchPageContent(
        slug,
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );

      if (result.success && result.content) {
        setPage(result.content);
      } else {
        alert(`Failed to load page: ${result.error}`);
      }
    } catch (error) {
      alert(
        `Error loading page: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const updatePage = (updates: Partial<PageContent>) => {
    setPage((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const updateSection = (index: number, updatedSection: Section) => {
    const newSections = [...page.sections];
    newSections[index] = updatedSection;
    updatePage({ sections: newSections });
  };

  const deleteSection = (index: number) => {
    const newSections = page.sections.filter((_, i) => i !== index);
    // Update order for remaining sections
    const reorderedSections = newSections.map((section, i) => ({
      ...section,
      order: i,
    }));
    updatePage({ sections: reorderedSections });
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...page.sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (
      targetIndex < 0 ||
      targetIndex >= newSections.length ||
      !newSections[index] ||
      !newSections[targetIndex]
    )
      return;

    // Swap sections
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // Update order
    const reorderedSections = newSections.map((section, i) => ({
      ...section,
      order: i,
    }));
    updatePage({ sections: reorderedSections });
  };

  const addSection = (type: SectionType) => {
    const newSection = createSection(type, page.sections.length);
    updatePage({ sections: [...page.sections, newSection] });
    setShowAddSection(false);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!page.title.trim()) {
      newErrors.title = "Title is required";
    }

    if (!page.slug.trim()) {
      newErrors.slug = "Slug is required";
    }

    if (
      page.isLandingPage &&
      existingLandingPage &&
      existingLandingPage !== slug
    ) {
      newErrors.isLandingPage = `Another page (${existingLandingPage}) is already set as the landing page`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePublish = async () => {
    if (!validate()) {
      alert("Please fix validation errors before publishing");
      return;
    }

    setSaving(true);
    try {
      console.log("Publishing page:", { slug: page.slug, title: page.title });
      const publishedPage = {
        ...page,
        status: "published" as const,
      };
      const result = await savePageFile(
        page.slug,
        publishedPage,
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );

      console.log("Publish result:", result);

      if (result.success) {
        // Delete draft after successful publish
        if (page.slug) {
          deleteDraft(page.slug);
        }
        setPage(publishedPage);
        setHasUnsavedChanges(false);
        alert("Page published successfully!");
        onSave();
      } else {
        console.error("Publish failed:", result.error);
        alert(`Failed to publish: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("Publish error:", error);
      alert(
        `Error publishing page: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => {
    if (!page.slug) {
      alert("Please enter a slug before saving draft");
      return;
    }

    const success = saveDraftToStore(page);
    if (success) {
      setHasUnsavedChanges(false);
      alert("Draft saved locally");
    } else {
      alert("Failed to save draft");
    }
  };

  const handleTitleChange = (title: string) => {
    const updates: Partial<PageContent> = { title };

    // Auto-generate slug for new pages
    if (!slug) {
      updates.slug = generateSlug(title);
    }

    updatePage(updates);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div style={{ color: colors.textSecondary }}>Loading page...</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h2 style={{ color: colors.text }} className="text-2xl font-bold">
          {slug ? "Edit Page" : "Create New Page"}
        </h2>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            style={{
              borderColor: colors.secondary,
              color: colors.text,
            }}
            className="px-4 py-2 border rounded-lg hover:opacity-75"
          >
            Cancel
          </button>

          <button
            onClick={handleSaveDraft}
            style={{
              borderColor: colors.secondary,
              color: colors.text,
            }}
            className="px-4 py-2 border rounded-lg hover:opacity-75"
            disabled={!page.slug}
          >
            Save Draft
          </button>

          <button
            onClick={handlePublish}
            style={{
              backgroundColor: colors.primary,
              color: "#ffffff",
            }}
            className="px-4 py-2 rounded-lg hover:opacity-90 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? "Publishing..." : "Publish"}
          </button>
        </div>
      </div>

      {hasUnsavedChanges && (
        <div className="mb-4 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
          You have unsaved changes
        </div>
      )}

      {/* Metadata Section */}
      <div
        style={{
          backgroundColor: colors.background,
          borderColor: colors.secondary,
        }}
        className="mb-6 p-6 border rounded-lg"
      >
        <h3
          style={{ color: colors.text }}
          className="text-lg font-semibold mb-4"
        >
          Page Information
        </h3>

        <div className="space-y-4">
          <div>
            <label
              style={{ color: colors.text }}
              className="block text-sm font-medium mb-1"
            >
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={page.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              style={{
                borderColor: errors.title ? "#ef4444" : colors.secondary,
                backgroundColor: colors.background,
                color: colors.text,
              }}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
              placeholder="Enter page title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          <div>
            <label
              style={{ color: colors.text }}
              className="block text-sm font-medium mb-1"
            >
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={page.slug}
              onChange={(e) =>
                updatePage({ slug: generateSlug(e.target.value) })
              }
              style={{
                borderColor: errors.slug ? "#ef4444" : colors.secondary,
                backgroundColor: colors.background,
                color: colors.text,
              }}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 font-mono text-sm"
              placeholder="page-url-slug"
              disabled={!!slug} // Can't change slug when editing
            />
            {errors.slug && (
              <p className="mt-1 text-sm text-red-500">{errors.slug}</p>
            )}
            {slug && (
              <p
                style={{ color: colors.textSecondary }}
                className="mt-1 text-xs"
              >
                Slug cannot be changed when editing
              </p>
            )}
          </div>

          <div>
            <label
              style={{ color: colors.text }}
              className="block text-sm font-medium mb-1"
            >
              Meta Description
            </label>
            <textarea
              value={page.metaDescription || ""}
              onChange={(e) => updatePage({ metaDescription: e.target.value })}
              style={{
                borderColor: colors.secondary,
                backgroundColor: colors.background,
                color: colors.text,
              }}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
              rows={2}
              placeholder="Brief description for SEO (optional)"
            />
          </div>

          <div>
            <label
              style={{ color: colors.text }}
              className="block text-sm font-medium mb-1"
            >
              Status
            </label>
            <select
              value={page.status}
              onChange={(e) =>
                updatePage({ status: e.target.value as "draft" | "published" })
              }
              style={{
                borderColor: colors.secondary,
                backgroundColor: colors.background,
                color: colors.text,
              }}
              className="px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
            </select>
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={page.isLandingPage || false}
                onChange={(e) =>
                  updatePage({ isLandingPage: e.target.checked })
                }
                style={{
                  borderColor: colors.secondary,
                  accentColor: colors.primary,
                }}
                className="w-4 h-4 rounded focus:ring-2"
              />
              <span
                style={{ color: colors.text }}
                className="text-sm font-medium"
              >
                Set as landing page (homepage)
              </span>
            </label>
            {page.isLandingPage &&
              existingLandingPage &&
              existingLandingPage !== slug && (
                <p style={{ color: "#ca8a04" }} className="mt-1 text-sm">
                  Warning: Page "{existingLandingPage}" is currently the landing
                  page. Saving this will replace it.
                </p>
              )}
            {errors.isLandingPage && (
              <p className="mt-1 text-sm text-red-500">
                {errors.isLandingPage}
              </p>
            )}
            <p style={{ color: colors.textSecondary }} className="mt-1 text-xs">
              The landing page will be displayed at the root URL (/)
            </p>
          </div>

          <div>
            <label
              style={{ color: colors.text }}
              className="block text-sm font-medium mb-2"
            >
              Page Layout
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="layout"
                  checked={page.useLayout === false}
                  onChange={() => updatePage({ useLayout: false })}
                  style={{
                    borderColor: colors.secondary,
                    accentColor: colors.primary,
                  }}
                  className="w-4 h-4 rounded focus:ring-2"
                />
                <span style={{ color: colors.text }} className="text-sm">
                  No Layout
                </span>
              </label>

              {availableLayouts.map((layout) => (
                <label key={layout.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="layout"
                    checked={
                      page.useLayout !== false && page.layoutId === layout.id
                    }
                    onChange={() =>
                      updatePage({
                        useLayout: true,
                        layoutId: layout.id,
                      })
                    }
                    style={{
                      borderColor: colors.secondary,
                      accentColor: colors.primary,
                    }}
                    className="w-4 h-4 rounded focus:ring-2"
                  />
                  <div>
                    <div
                      style={{ color: colors.text }}
                      className="text-sm font-medium"
                    >
                      {layout.name}
                    </div>
                    <div
                      style={{ color: colors.textSecondary }}
                      className="text-xs"
                    >
                      {layout.description}
                    </div>
                  </div>
                </label>
              ))}
            </div>
            <p style={{ color: colors.textSecondary }} className="mt-2 text-xs">
              {availableLayouts.length === 1
                ? "Only one layout is available, and will be used by default."
                : "Select a layout for this page, or choose 'No Layout' to render without a layout wrapper."}
            </p>
          </div>
        </div>
      </div>

      {/* Sections */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: colors.text }} className="text-lg font-semibold">
            Page Sections
          </h3>
          <button
            onClick={() => setShowAddSection(!showAddSection)}
            style={{
              backgroundColor: colors.accent || "#16a34a",
              color: "#ffffff",
            }}
            className="px-4 py-2 rounded-lg hover:opacity-90"
          >
            + Add Section
          </button>
        </div>

        {showAddSection && (
          <div
            style={{
              backgroundColor: colors.background,
              borderColor: colors.secondary,
            }}
            className="mb-4 p-4 border rounded-lg"
          >
            <p
              style={{ color: colors.text }}
              className="text-sm font-medium mb-3"
            >
              Select section type:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => addSection("hero")}
                className="px-4 py-2 bg-background border border-text/20 rounded hover:bg-primary/5 text-left"
              >
                <div className="font-medium">Hero</div>
                <div className="text-xs text-text-secondary">
                  Large banner with title and CTA
                </div>
              </button>

              <button
                onClick={() => addSection("text")}
                className="px-4 py-2 bg-background border border-text/20 rounded hover:bg-primary/5 text-left"
              >
                <div className="font-medium">Text Block</div>
                <div className="text-xs text-text-secondary">
                  Paragraph content with optional heading
                </div>
              </button>

              <button
                onClick={() => addSection("cardGrid")}
                className="px-4 py-2 bg-background border border-text/20 rounded hover:bg-primary/5 text-left"
              >
                <div className="font-medium">Card Grid</div>
                <div className="text-xs text-text-secondary">
                  Multiple cards in a grid layout
                </div>
              </button>

              <button
                onClick={() => addSection("cta")}
                className="px-4 py-2 bg-background border border-text/20 rounded hover:bg-primary/5 text-left"
              >
                <div className="font-medium">Call to Action</div>
                <div className="text-xs text-text-secondary">
                  Prominent button with heading
                </div>
              </button>

              <button
                onClick={() => addSection("contentList")}
                className="px-4 py-2 bg-background border border-text/20 rounded hover:bg-primary/5 text-left"
              >
                <div className="font-medium">Content List</div>
                <div className="text-xs text-text-secondary">
                  Display items from content collections
                </div>
              </button>
            </div>
          </div>
        )}

        {page.sections.length === 0 && (
          <div className="text-center py-12 bg-background rounded-lg border-2 border-dashed border-text/20">
            <p className="text-text-secondary">
              No sections yet. Click "Add Section" to create content.
            </p>
          </div>
        )}

        {page.sections.map((section, index) => {
          const props = {
            section,
            onChange: (updated: Section) => updateSection(index, updated),
            onDelete: () => deleteSection(index),
            onMoveUp: () => moveSection(index, "up"),
            onMoveDown: () => moveSection(index, "down"),
            canMoveUp: index > 0,
            canMoveDown: index < page.sections.length - 1,
          };

          switch (section.type) {
            case "hero":
              return (
                <HeroEditor key={section.id} {...props} section={section} />
              );
            case "text":
              return (
                <TextEditor key={section.id} {...props} section={section} />
              );
            case "cardGrid":
              return (
                <CardGridEditor key={section.id} {...props} section={section} />
              );
            case "cta":
              return (
                <CtaEditor key={section.id} {...props} section={section} />
              );
            case "contentList":
              return (
                <ContentListEditor
                  key={section.id}
                  {...props}
                  section={section}
                />
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
