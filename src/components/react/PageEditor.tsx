import { useState, useEffect, useRef, type ReactNode } from "react";
import type {
  PageContent,
  Section,
  SectionType,
  Layout,
  ComponentSection,
  CompositeComponent,
  PrimitiveComponent,
  SectionStyleOverrides,
  ThemeColorKey,
  ThemeFontKey,
} from "../../types/cms";
import {
  fetchPageContent,
  savePageFile,
  fetchPagesDirectory,
  fetchLayoutsDirectory,
  fetchLayoutContent,
  fetchCompositeComponents,
  fetchPrimitiveComponents,
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
import ComponentSectionEditor from "./sections/ComponentSectionEditor";
import { SectionEditorContext } from "./sections/SectionEditorContext";

interface PageEditorProps {
  slug: string | undefined; // undefined = creating new page
  token: string;
  onSave: () => void;
  onCancel: () => void;
  useGitHubAPI?: boolean;
}

// Metadata for the legacy section palette tiles (ASCII icons only)
const SECTION_META = {
  hero: {
    label: "Hero",
    icon: "[H]",
    description: "Large banner with title and CTA",
    color: "#6366f1",
  },
  text: {
    label: "Text Block",
    icon: "[T]",
    description: "Paragraph content with heading",
    color: "#0ea5e9",
  },
  cardGrid: {
    label: "Card Grid",
    icon: "[G]",
    description: "Multiple cards in a grid",
    color: "#f59e0b",
  },
  cta: {
    label: "Call to Action",
    icon: "[!]",
    description: "Prominent button with heading",
    color: "#ef4444",
  },
  contentList: {
    label: "Content List",
    icon: "[L]",
    description: "Items from a collection",
    color: "#10b981",
  },
} satisfies Partial<
  Record<
    SectionType,
    { label: string; icon: string; description: string; color: string }
  >
>;

type PaletteTab = "settings" | "blocks";

type DragSource =
  | { kind: "palette"; sectionType: SectionType }
  | { kind: "composite"; composite: CompositeComponent }
  | { kind: "primitive"; primitive: PrimitiveComponent }
  | {
      kind: "canvas";
      sectionId: string;
      index: number;
      parentId: string | null;
    };

type DropTarget = { parentId: string | null; index: number } | null;

/** Returns display metadata for a canvas card, resolving composite names dynamically */
function getCanvasCardMeta(
  section: Section,
  composites: CompositeComponent[],
  primitives: PrimitiveComponent[] = [],
): { label: string; icon: string; color: string } {
  if (section.type === "component") {
    if (section.componentType === "primitive") {
      const prim = primitives.find((p) => p.id === section.componentId);
      return {
        label:
          section.label || prim?.name || section.componentId || "Primitive",
        icon: "[P]",
        color: "#06b6d4",
      };
    }
    const comp = composites.find((c) => c.id === section.componentId);
    return {
      label: section.label || comp?.name || section.componentId || "Component",
      icon: "[C]",
      color: "#8b5cf6",
    };
  }
  return (
    SECTION_META[section.type as keyof typeof SECTION_META] ?? {
      label: section.type,
      icon: "[ ]",
      color: "#6b7280",
    }
  );
}

// ── Recursive tree helpers ──────────────────────────────────────────────────

function findSectionById(sections: Section[], id: string): Section | null {
  for (const s of sections) {
    if (s.id === id) return s;
    if (s.children?.length) {
      const found = findSectionById(s.children, id);
      if (found) return found;
    }
  }
  return null;
}

function updateSectionById(
  sections: Section[],
  id: string,
  updated: Section,
): Section[] {
  return sections.map((s) => {
    if (s.id === id) return updated;
    if (s.children?.length)
      return { ...s, children: updateSectionById(s.children, id, updated) };
    return s;
  });
}

function deleteSectionById(sections: Section[], id: string): Section[] {
  return sections
    .filter((s) => s.id !== id)
    .map((s, i) => ({
      ...s,
      order: i,
      ...(s.children?.length
        ? { children: deleteSectionById(s.children, id) }
        : {}),
    }));
}

function moveSectionById(
  sections: Section[],
  id: string,
  dir: "up" | "down",
): Section[] {
  const idx = sections.findIndex((s) => s.id === id);
  if (idx >= 0) {
    const target = dir === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= sections.length) return sections;
    const arr = [...sections];
    [arr[idx], arr[target]] = [arr[target]!, arr[idx]!];
    return arr.map((s, i) => ({ ...s, order: i }));
  }
  return sections.map((s) =>
    s.children?.length
      ? { ...s, children: moveSectionById(s.children, id, dir) }
      : s,
  );
}

function addSectionToList(
  sections: Section[],
  parentId: string | null,
  newSection: Section,
  atIndex?: number,
): Section[] {
  if (parentId === null) {
    const arr = [...sections];
    if (atIndex !== undefined) arr.splice(atIndex, 0, newSection);
    else arr.push(newSection);
    return arr.map((s, i) => ({ ...s, order: i }));
  }
  return sections.map((s) => {
    if (s.id === parentId) {
      const children = [...(s.children ?? [])];
      if (atIndex !== undefined) children.splice(atIndex, 0, newSection);
      else children.push(newSection);
      return { ...s, children: children.map((c, i) => ({ ...c, order: i })) };
    }
    if (s.children?.length)
      return {
        ...s,
        children: addSectionToList(s.children, parentId, newSection, atIndex),
      };
    return s;
  });
}

function reorderSectionInList(
  sections: Section[],
  parentId: string | null,
  fromIndex: number,
  toIndex: number,
): Section[] {
  if (parentId === null) {
    const arr = [...sections];
    const [moved] = arr.splice(fromIndex, 1);
    if (!moved) return sections;
    const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
    arr.splice(insertAt, 0, moved);
    return arr.map((s, i) => ({ ...s, order: i }));
  }
  return sections.map((s) => {
    if (s.id === parentId) {
      const arr = [...(s.children ?? [])];
      const [moved] = arr.splice(fromIndex, 1);
      if (!moved) return s;
      const insertAt = fromIndex < toIndex ? toIndex - 1 : toIndex;
      arr.splice(insertAt, 0, moved);
      return { ...s, children: arr.map((c, i) => ({ ...c, order: i })) };
    }
    if (s.children?.length)
      return {
        ...s,
        children: reorderSectionInList(
          s.children,
          parentId,
          fromIndex,
          toIndex,
        ),
      };
    return s;
  });
}

function findSiblingInfo(
  sections: Section[],
  id: string,
  parentId: string | null = null,
): { isFirst: boolean; isLast: boolean; parentId: string | null } | null {
  const idx = sections.findIndex((s) => s.id === id);
  if (idx >= 0)
    return {
      isFirst: idx === 0,
      isLast: idx === sections.length - 1,
      parentId,
    };
  for (const s of sections) {
    if (s.children?.length) {
      const found = findSiblingInfo(s.children, id, s.id);
      if (found) return found;
    }
  }
  return null;
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
    case "component":
      return {
        ...baseSection,
        type: "component",
        componentId: "",
        componentType: "composite",
        columns: 12,
        data: {},
      };
  }
}

/** One-line preview text shown inside each canvas card */
function getSectionPreview(section: Section): string {
  switch (section.type) {
    case "hero":
      return section.title || "Untitled hero";
    case "text":
      return (
        section.heading || section.content?.slice(0, 60) || "Empty text block"
      );
    case "cardGrid":
      return `${section.cards.length} card${section.cards.length === 1 ? "" : "s"}${
        section.heading ? ` - ${section.heading}` : ""
      }`;
    case "cta":
      return section.heading || section.buttonText || "Empty CTA";
    case "contentList":
      return `${section.collection} - ${section.displayMode}`;
    case "component":
      return section.label || section.componentId || "Component";
    default:
      return "";
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

  // Page data
  const [page, setPage] = useState<PageContent>(createEmptyPage());
  const [loading, setLoading] = useState(!!slug);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [existingLandingPage, setExistingLandingPage] = useState<string | null>(
    null,
  );
  const [availableLayouts, setAvailableLayouts] = useState<Layout[]>([]);

  // Canvas / palette UI
  const [paletteTab, setPaletteTab] = useState<PaletteTab>("blocks");
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [expandedSectionIds, setExpandedSectionIds] = useState<Set<string>>(
    new Set(),
  );
  const [compositeComponents, setCompositeComponents] = useState<
    CompositeComponent[]
  >([]);
  const [primitiveComponents, setPrimitiveComponents] = useState<
    PrimitiveComponent[]
  >([]);
  const [loadingComposites, setLoadingComposites] = useState(true);

  // Drag-and-drop
  const dragSourceRef = useRef<DragSource | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);
  const [nestTarget, setNestTarget] = useState<string | null>(null);
  const [canvasMode, setCanvasMode] = useState<"blocks" | "preview">("blocks");
  const [previewKey, setPreviewKey] = useState(0);

  // ── Data loading ─────────────────────────────────────────────────────────

  useEffect(() => {
    checkForLandingPage();
    loadAvailableLayouts();
    loadCompositeComponents();

    if (slug) {
      const draft = loadDraft(slug);
      if (draft) {
        setPage(draft);
        setHasUnsavedChanges(true);
        setLoading(false);
        return;
      }
      loadPageFromGitHub();
    }
  }, [slug]);

  useEffect(() => {
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
        for (const file of result.files) {
          const pageSlug = file.name.replace(".json", "");
          if (pageSlug === slug) continue;
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
      const result = await fetchLayoutsDirectory(
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );
      if (result.success && result.files && result.files.length > 0) {
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
              if (contentResult.success && contentResult.content)
                return contentResult.content;
            } catch {}
            return {
              id: layoutId,
              name: layoutId,
              description: "",
              header: {
                showNavigation: true,
                navigationStyle: "default" as const,
              },
              footer: { showFooter: true, footerStyle: "default" as const },
            };
          }),
        );
        setAvailableLayouts(layouts);
        if (!slug && layouts.length > 0) {
          setPage((prev) => ({
            ...prev,
            useLayout: true,
            layoutId: layouts[0]?.id ?? "",
          }));
        }
      } else {
        setAvailableLayouts([]);
      }
    } catch {
      setAvailableLayouts([]);
    }
  };

  const loadCompositeComponents = async () => {
    setLoadingComposites(true);
    try {
      const [composites, primitives] = await Promise.all([
        fetchCompositeComponents(token, undefined, undefined, useGitHubAPI),
        fetchPrimitiveComponents(token, undefined, undefined, useGitHubAPI),
      ]);
      setCompositeComponents(composites);
      setPrimitiveComponents(primitives);
    } catch (err) {
      console.error("Error loading components:", err);
    } finally {
      setLoadingComposites(false);
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

  // ── Page / section mutations ──────────────────────────────────────────────

  const updatePage = (updates: Partial<PageContent>) => {
    setPage((prev) => ({ ...prev, ...updates }));
    setHasUnsavedChanges(true);
  };

  const updateSectionInPage = (id: string, updated: Section) => {
    updatePage({ sections: updateSectionById(page.sections, id, updated) });
  };

  const deleteSectionFromPage = (id: string) => {
    if (activeSectionId === id) setActiveSectionId(null);
    updatePage({ sections: deleteSectionById(page.sections, id) });
  };

  const moveSectionInPage = (id: string, dir: "up" | "down") => {
    updatePage({ sections: moveSectionById(page.sections, id, dir) });
  };

  const addSection = (
    type: SectionType,
    parentId: string | null = null,
    atIndex?: number,
  ) => {
    const newSection = createSection(type, 0);
    updatePage({
      sections: addSectionToList(page.sections, parentId, newSection, atIndex),
    });
    setActiveSectionId(newSection.id);
    if (parentId) setExpandedSectionIds((prev) => new Set([...prev, parentId]));
  };

  const addCompositeSection = (
    composite: CompositeComponent,
    parentId: string | null = null,
    atIndex?: number,
  ) => {
    const newSection: ComponentSection = {
      id: generateSectionId(),
      type: "component",
      order: 0,
      componentId: composite.id,
      componentType: "composite",
      columns: composite.defaultColumns,
      data: {},
      label: composite.name,
    };
    updatePage({
      sections: addSectionToList(page.sections, parentId, newSection, atIndex),
    });
    setActiveSectionId(newSection.id);
    if (parentId) setExpandedSectionIds((prev) => new Set([...prev, parentId]));
  };

  const addPrimitiveSection = (
    primitive: PrimitiveComponent,
    parentId: string | null = null,
    atIndex?: number,
  ) => {
    const newSection: ComponentSection = {
      id: generateSectionId(),
      type: "component",
      order: 0,
      componentId: primitive.id,
      componentType: "primitive",
      columns: 12,
      data: {},
      label: primitive.name,
    };
    updatePage({
      sections: addSectionToList(page.sections, parentId, newSection, atIndex),
    });
    setActiveSectionId(newSection.id);
    if (parentId) setExpandedSectionIds((prev) => new Set([...prev, parentId]));
  };

  const handleTitleChange = (title: string) => {
    const updates: Partial<PageContent> = { title };
    if (!slug) updates.slug = generateSlug(title);
    updatePage(updates);
  };

  // ── Save / publish ────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!page.title.trim()) newErrors.title = "Title is required";
    if (!page.slug.trim()) newErrors.slug = "Slug is required";
    if (
      page.isLandingPage &&
      existingLandingPage &&
      existingLandingPage !== slug
    ) {
      newErrors.isLandingPage = `"${existingLandingPage}" is already the landing page`;
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSaveDraft = async () => {
    if (!page.slug) {
      alert("Please enter a slug before saving draft");
      return;
    }
    // Always persist to localStorage for recovery
    saveDraftToStore(page);
    // In dev mode also write to disk so the preview iframe (and dev server) picks it up
    setSaving(true);
    try {
      const result = await savePageFile(
        page.slug,
        page,
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );
      if (result.success) {
        setHasUnsavedChanges(false);
        // Bump the preview iframe if it's open
        setPreviewKey((k) => k + 1);
      } else {
        alert(`Failed to save draft: ${result.error || "Unknown error"}`);
      }
    } catch (err) {
      alert(
        `Error saving draft: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const publishedPage = { ...page, status: "published" as const };
      const result = await savePageFile(
        page.slug,
        publishedPage,
        token,
        undefined,
        undefined,
        useGitHubAPI,
      );
      if (result.success) {
        if (page.slug) deleteDraft(page.slug);
        setPage(publishedPage);
        setHasUnsavedChanges(false);
        setPreviewKey((k) => k + 1);
        onSave();
      } else {
        alert(`Failed to publish: ${result.error || "Unknown error"}`);
      }
    } catch (error) {
      alert(
        `Error publishing: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  // ── Drag and drop ─────────────────────────────────────────────────────────

  const handlePaletteDragStart = (type: SectionType) => {
    dragSourceRef.current = { kind: "palette", sectionType: type };
  };

  const handleCompositeDragStart = (composite: CompositeComponent) => {
    dragSourceRef.current = { kind: "composite", composite };
  };

  const handleCanvasDragStart = (
    sectionId: string,
    index: number,
    parentId: string | null,
  ) => {
    dragSourceRef.current = { kind: "canvas", sectionId, index, parentId };
  };

  const handleDrop = (
    e: React.DragEvent,
    insertBefore: number,
    parentId: string | null,
  ) => {
    e.preventDefault();
    setDropTarget(null);
    const src = dragSourceRef.current;
    if (!src) return;
    if (src.kind === "palette") {
      addSection(src.sectionType, parentId, insertBefore);
    } else if (src.kind === "composite") {
      addCompositeSection(src.composite, parentId, insertBefore);
    } else if (src.kind === "primitive") {
      addPrimitiveSection(src.primitive, parentId, insertBefore);
    } else if (src.kind === "canvas") {
      if (src.parentId === parentId) {
        updatePage({
          sections: reorderSectionInList(
            page.sections,
            parentId,
            src.index,
            insertBefore,
          ),
        });
      } else {
        const moved = findSectionById(page.sections, src.sectionId);
        if (!moved) return;
        let updated = deleteSectionById(page.sections, src.sectionId);
        updated = addSectionToList(updated, parentId, moved, insertBefore);
        updatePage({ sections: updated });
        if (parentId)
          setExpandedSectionIds((prev) => new Set([...prev, parentId]));
      }
    }
    dragSourceRef.current = null;
  };

  const handleDragEnd = () => {
    dragSourceRef.current = null;
    setDropTarget(null);
    setNestTarget(null);
  };

  // ── Derived ───────────────────────────────────────────────────────────────

  const activeSection = activeSectionId
    ? findSectionById(page.sections, activeSectionId)
    : null;
  const activeMeta = activeSection
    ? getCanvasCardMeta(activeSection, compositeComponents, primitiveComponents)
    : null;
  const activeSiblingInfo = activeSectionId
    ? findSiblingInfo(page.sections, activeSectionId)
    : null;

  // ── Recursive canvas renderer ─────────────────────────────────────────────

  const renderSectionList = (
    sections: Section[],
    parentId: string | null,
    depth: number,
  ): ReactNode => {
    const mkDrop = (index: number) => (
      <div
        key={`dz-${parentId ?? "root"}-${index}`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDropTarget({ parentId, index });
          setNestTarget(null);
        }}
        onDrop={(e) => {
          e.stopPropagation();
          handleDrop(e, index, parentId);
        }}
        onDragLeave={() => setDropTarget(null)}
        className="transition-all duration-150"
        style={{
          height:
            dropTarget?.parentId === parentId && dropTarget.index === index
              ? "36px"
              : depth > 0
                ? "4px"
                : "8px",
          borderRadius: "6px",
          backgroundColor:
            dropTarget?.parentId === parentId && dropTarget.index === index
              ? "#6366f120"
              : "transparent",
          border:
            dropTarget?.parentId === parentId && dropTarget.index === index
              ? "2px dashed #6366f1"
              : "2px dashed transparent",
        }}
      />
    );
    return (
      <>
        {mkDrop(0)}
        {sections.map((section, index) => {
          const meta = getCanvasCardMeta(
            section,
            compositeComponents,
            primitiveComponents,
          );
          const isActive = activeSectionId === section.id;
          const isExpanded = expandedSectionIds.has(section.id);
          return (
            <div key={section.id}>
              <div
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  handleCanvasDragStart(section.id, index, parentId);
                }}
                onDragEnd={handleDragEnd}
                onClick={(e) => {
                  e.stopPropagation();
                  const willExpand = !isExpanded || !isActive;
                  setActiveSectionId(isActive ? null : section.id);
                  setExpandedSectionIds((prev) => {
                    const next = new Set(prev);
                    if (willExpand) next.add(section.id);
                    else next.delete(section.id);
                    return next;
                  });
                }}
                className="group relative flex items-stretch rounded-lg cursor-pointer select-none transition-shadow"
                onDragOver={(e) => {
                  if (!dragSourceRef.current) return;
                  // Don't nest a section into itself
                  if (
                    dragSourceRef.current.kind === "canvas" &&
                    dragSourceRef.current.sectionId === section.id
                  )
                    return;
                  e.preventDefault();
                  e.stopPropagation();
                  setDropTarget(null);
                  setNestTarget(section.id);
                }}
                onDragLeave={(e) => {
                  // Only clear if leaving the card itself (not entering a child)
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setNestTarget((prev) =>
                      prev === section.id ? null : prev,
                    );
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setNestTarget(null);
                  const childCount = (section.children ?? []).length;
                  handleDrop(e, childCount, section.id);
                  setExpandedSectionIds(
                    (prev) => new Set([...prev, section.id]),
                  );
                }}
                style={{
                  marginLeft: depth > 0 ? `${depth * 12}px` : undefined,
                  border: isActive
                    ? `2px solid ${meta.color}`
                    : nestTarget === section.id
                      ? `2px dashed ${meta.color}`
                      : `1px solid ${colors.secondary}`,
                  backgroundColor: isActive
                    ? meta.color + "08"
                    : nestTarget === section.id
                      ? meta.color + "12"
                      : colors.background,
                  boxShadow: isActive
                    ? `0 0 0 3px ${meta.color}22`
                    : nestTarget === section.id
                      ? `0 0 0 3px ${meta.color}33`
                      : undefined,
                }}
              >
                <div
                  className="w-1 rounded-l-lg shrink-0"
                  style={{ backgroundColor: meta.color }}
                />
                <div className="flex items-center px-2 text-gray-300 group-hover:text-gray-500 cursor-grab active:cursor-grabbing shrink-0">
                  <svg
                    width="10"
                    height="16"
                    viewBox="0 0 10 16"
                    fill="currentColor"
                  >
                    <circle cx="3" cy="3" r="1.5" />
                    <circle cx="7" cy="3" r="1.5" />
                    <circle cx="3" cy="8" r="1.5" />
                    <circle cx="7" cy="8" r="1.5" />
                    <circle cx="3" cy="13" r="1.5" />
                    <circle cx="7" cy="13" r="1.5" />
                  </svg>
                </div>
                <div className="flex-1 py-3 pr-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className="text-xs font-mono font-bold"
                      style={{ color: meta.color }}
                    >
                      {meta.icon}
                    </span>
                    <span
                      className="text-xs font-semibold uppercase tracking-wide"
                      style={{ color: meta.color }}
                    >
                      {meta.label}
                    </span>
                    {isActive && (
                      <span
                        className="text-xs ml-auto font-medium pr-1"
                        style={{ color: meta.color }}
                      >
                        editing &rarr;
                      </span>
                    )}
                  </div>
                  {nestTarget === section.id ? (
                    <p
                      className="text-xs font-semibold animate-pulse"
                      style={{ color: meta.color }}
                    >
                      Drop to nest inside &darr;
                    </p>
                  ) : (
                    <p
                      className="text-sm truncate"
                      style={{ color: colors.textSecondary }}
                    >
                      {getSectionPreview(section)}
                    </p>
                  )}
                </div>
                <div className="flex items-center shrink-0 px-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedSectionIds((prev) => {
                        const next = new Set(prev);
                        if (isExpanded) next.delete(section.id);
                        else next.add(section.id);
                        return next;
                      });
                    }}
                    className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100"
                    title={isExpanded ? "Collapse" : "Expand / add children"}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      {isExpanded ? (
                        <path d="M1 3l4 4 4-4" />
                      ) : (
                        <path d="M3 1l4 4-4 4" />
                      )}
                    </svg>
                  </button>
                </div>
                <div
                  className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => moveSectionInPage(section.id, "up")}
                    disabled={index === 0}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                    title="Move up"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                    >
                      <path d="M6 2L1 9h10L6 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moveSectionInPage(section.id, "down")}
                    disabled={index === sections.length - 1}
                    className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                    title="Move down"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                    >
                      <path d="M6 10L1 3h10L6 10z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => deleteSectionFromPage(section.id)}
                    className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600"
                    title="Delete"
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="currentColor"
                    >
                      <path
                        d="M2 2l8 8M10 2l-8 8"
                        stroke="currentColor"
                        strokeWidth="2"
                        fill="none"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              {isExpanded && (
                <div
                  style={{
                    borderLeft: `2px solid ${meta.color}50`,
                    marginLeft: `${(depth + 1) * 12 + 4}px`,
                  }}
                >
                  {renderSectionList(
                    section.children ?? [],
                    section.id,
                    depth + 1,
                  )}
                </div>
              )}
              {mkDrop(index + 1)}
            </div>
          );
        })}
      </>
    );
  };

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-lg">Loading page...</p>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ backgroundColor: colors.background, color: colors.text }}
    >
      {/* ── Top bar ── */}
      <header
        className="flex items-center gap-3 px-4 py-2 border-b shrink-0"
        style={{
          borderColor: colors.secondary,
          backgroundColor: colors.background,
        }}
      >
        <button
          onClick={onCancel}
          className="px-3 py-1 text-sm border rounded hover:opacity-75 shrink-0"
          style={{ borderColor: colors.secondary, color: colors.text }}
        >
          &larr; Back
        </button>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={page.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Page title"
            className="w-full text-xl font-bold bg-transparent border-none outline-none placeholder-gray-400"
            style={{ color: colors.text }}
          />
          {errors.title && (
            <p className="text-xs text-red-500 mt-0.5">{errors.title}</p>
          )}
        </div>

        {page.slug && (
          <span
            className="hidden sm:block px-2 py-0.5 text-xs font-mono rounded shrink-0"
            style={{
              backgroundColor: colors.secondary + "40",
              color: colors.textSecondary,
            }}
          >
            /{page.slug}
          </span>
        )}

        <span
          className={`px-2 py-0.5 text-xs font-medium rounded shrink-0 ${
            page.status === "published"
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {page.status}
        </span>

        {hasUnsavedChanges && (
          <span className="text-xs text-yellow-600 shrink-0">unsaved</span>
        )}

        {/* View toggle */}
        <div
          className="flex rounded overflow-hidden border shrink-0"
          style={{ borderColor: colors.secondary }}
        >
          {(["blocks", "preview"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                if (mode === "preview") setPreviewKey((k) => k + 1);
                setCanvasMode(mode);
              }}
              className="px-3 py-1 text-xs font-medium capitalize transition-colors"
              style={{
                backgroundColor:
                  canvasMode === mode ? colors.primary : "transparent",
                color: canvasMode === mode ? "#fff" : colors.textSecondary,
              }}
            >
              {mode === "blocks" ? "[=] Blocks" : "[>] Preview"}
            </button>
          ))}
        </div>

        <button
          onClick={handleSaveDraft}
          disabled={!page.slug || saving}
          className="px-3 py-1.5 text-sm border rounded hover:opacity-75 shrink-0 disabled:opacity-40"
          style={{ borderColor: colors.secondary, color: colors.text }}
        >
          {saving ? "Saving..." : "Save Draft"}
        </button>

        <button
          onClick={handlePublish}
          disabled={saving}
          className="px-3 py-1.5 text-sm rounded hover:opacity-90 shrink-0 disabled:opacity-50"
          style={{ backgroundColor: colors.primary, color: "#fff" }}
        >
          {saving ? "Publishing..." : "Publish"}
        </button>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Left sidebar: palette ── */}
        <aside
          className="w-52 shrink-0 flex flex-col border-r overflow-y-auto"
          style={{
            borderColor: colors.secondary,
            backgroundColor: colors.background,
          }}
        >
          {/* Tab bar */}
          <div
            className="flex border-b"
            style={{ borderColor: colors.secondary }}
          >
            {(["settings", "blocks"] as PaletteTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setPaletteTab(tab)}
                className="flex-1 py-2 text-xs font-medium capitalize transition-colors"
                style={{
                  borderBottom:
                    paletteTab === tab
                      ? `2px solid ${colors.primary}`
                      : "2px solid transparent",
                  color:
                    paletteTab === tab ? colors.primary : colors.textSecondary,
                }}
              >
                {tab === "settings" ? "Settings" : "Blocks"}
              </button>
            ))}
          </div>

          {/* ── Settings tab ── */}
          {paletteTab === "settings" && (
            <div className="p-3 space-y-3 text-sm">
              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: colors.textSecondary }}
                >
                  Slug
                </label>
                <input
                  type="text"
                  value={page.slug}
                  onChange={(e) =>
                    updatePage({ slug: generateSlug(e.target.value) })
                  }
                  disabled={!!slug}
                  className="w-full px-2 py-1 border rounded text-xs font-mono disabled:opacity-60"
                  style={{
                    borderColor: colors.secondary,
                    backgroundColor: colors.background,
                    color: colors.text,
                  }}
                />
                {errors.slug && (
                  <p className="text-xs text-red-500 mt-0.5">{errors.slug}</p>
                )}
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: colors.textSecondary }}
                >
                  Meta Description
                </label>
                <textarea
                  value={page.metaDescription || ""}
                  onChange={(e) =>
                    updatePage({ metaDescription: e.target.value })
                  }
                  className="w-full px-2 py-1 border rounded text-xs"
                  style={{
                    borderColor: colors.secondary,
                    backgroundColor: colors.background,
                    color: colors.text,
                  }}
                  rows={3}
                  placeholder="SEO description"
                />
              </div>

              <div>
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: colors.textSecondary }}
                >
                  Layout
                </label>
                <div className="space-y-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="layout"
                      checked={page.useLayout === false}
                      onChange={() => updatePage({ useLayout: false })}
                      style={{ accentColor: colors.primary }}
                    />
                    <span className="text-xs">None</span>
                  </label>
                  {availableLayouts.map((layout) => (
                    <label
                      key={layout.id}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="layout"
                        checked={
                          page.useLayout !== false &&
                          page.layoutId === layout.id
                        }
                        onChange={() =>
                          updatePage({ useLayout: true, layoutId: layout.id })
                        }
                        style={{ accentColor: colors.primary }}
                      />
                      <span className="text-xs">{layout.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={page.isLandingPage || false}
                    onChange={(e) =>
                      updatePage({ isLandingPage: e.target.checked })
                    }
                    style={{ accentColor: colors.primary }}
                  />
                  <span className="text-xs font-medium">Landing page</span>
                </label>
                {errors.isLandingPage && (
                  <p className="text-xs text-red-500 mt-0.5">
                    {errors.isLandingPage}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ── Blocks tab ── */}
          {paletteTab === "blocks" && (
            <div className="p-2 space-y-1.5">
              {activeSectionId && (
                <div
                  className="text-xs px-2 py-1 rounded flex items-center gap-1"
                  style={{
                    backgroundColor: colors.primary + "15",
                    color: colors.primary,
                  }}
                >
                  <span className="truncate">
                    Adding child of <strong>{activeMeta?.label}</strong>
                  </span>
                  <button
                    onClick={() => setActiveSectionId(null)}
                    className="ml-auto shrink-0 opacity-60 hover:opacity-100 font-bold"
                    title="Add at root level instead"
                  >
                    x
                  </button>
                </div>
              )}
              <p
                className="text-xs px-1 pt-1 font-semibold uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Built-in
              </p>
              {(
                Object.keys(SECTION_META) as Array<keyof typeof SECTION_META>
              ).map((type) => {
                const meta = SECTION_META[type];
                return (
                  <div
                    key={type}
                    draggable
                    onDragStart={() => handlePaletteDragStart(type)}
                    onDragEnd={handleDragEnd}
                    onClick={() => addSection(type, activeSectionId)}
                    className="flex items-start gap-2 px-2 py-2 rounded cursor-grab active:cursor-grabbing hover:opacity-80 select-none"
                    style={{
                      backgroundColor: meta.color + "18",
                      border: `1px solid ${meta.color}55`,
                    }}
                  >
                    <span
                      className="text-xs font-mono font-bold shrink-0 mt-0.5 w-8 text-center"
                      style={{ color: meta.color }}
                    >
                      {meta.icon}
                    </span>
                    <div className="min-w-0">
                      <div
                        className="text-xs font-semibold"
                        style={{ color: colors.text }}
                      >
                        {meta.label}
                      </div>
                      <div
                        className="text-xs leading-tight"
                        style={{ color: colors.textSecondary }}
                      >
                        {meta.description}
                      </div>
                    </div>
                  </div>
                );
              })}
              <p
                className="text-xs px-1 pt-2 font-semibold uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Composites
              </p>
              {loadingComposites ? (
                <p className="text-xs text-gray-400 px-1">Loading...</p>
              ) : compositeComponents.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-1">
                  No composites yet.
                </p>
              ) : (
                compositeComponents.map((comp) => (
                  <div
                    key={comp.id}
                    draggable
                    onDragStart={() => handleCompositeDragStart(comp)}
                    onDragEnd={handleDragEnd}
                    onClick={() => addCompositeSection(comp, activeSectionId)}
                    className="flex items-start gap-2 px-2 py-2 rounded cursor-grab active:cursor-grabbing hover:opacity-80 select-none"
                    style={{
                      backgroundColor: "#8b5cf618",
                      border: "1px solid #8b5cf655",
                    }}
                  >
                    <span
                      className="text-xs font-mono font-bold shrink-0 mt-0.5 w-8 text-center"
                      style={{ color: "#8b5cf6" }}
                    >
                      [C]
                    </span>
                    <div className="min-w-0">
                      <div
                        className="text-xs font-semibold"
                        style={{ color: colors.text }}
                      >
                        {comp.name}
                      </div>
                      <div
                        className="text-xs leading-tight"
                        style={{ color: colors.textSecondary }}
                      >
                        {comp.description}
                      </div>
                      <div
                        className="text-xs mt-0.5"
                        style={{ color: colors.textSecondary }}
                      >
                        {comp.defaultColumns} col
                        {comp.defaultColumns !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <p
                className="text-xs px-1 pt-2 font-semibold uppercase tracking-wide"
                style={{ color: colors.textSecondary }}
              >
                Primitives
              </p>
              {loadingComposites ? (
                <p className="text-xs text-gray-400 px-1">Loading...</p>
              ) : primitiveComponents.length === 0 ? (
                <p className="text-xs text-gray-400 italic px-1">
                  No primitives found.
                </p>
              ) : (
                primitiveComponents.map((prim) => (
                  <div
                    key={prim.id}
                    draggable
                    onDragStart={() => {
                      dragSourceRef.current = {
                        kind: "primitive",
                        primitive: prim,
                      };
                    }}
                    onDragEnd={handleDragEnd}
                    onClick={() => addPrimitiveSection(prim, activeSectionId)}
                    className="flex items-start gap-2 px-2 py-2 rounded cursor-grab active:cursor-grabbing hover:opacity-80 select-none"
                    style={{
                      backgroundColor: "#06b6d418",
                      border: "1px solid #06b6d455",
                    }}
                  >
                    <span
                      className="text-xs font-mono font-bold shrink-0 mt-0.5 w-8 text-center"
                      style={{ color: "#06b6d4" }}
                    >
                      [P]
                    </span>
                    <div className="min-w-0">
                      <div
                        className="text-xs font-semibold"
                        style={{ color: colors.text }}
                      >
                        {prim.name}
                      </div>
                      <div
                        className="text-xs leading-tight"
                        style={{ color: colors.textSecondary }}
                      >
                        {prim.description}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </aside>

        {/* ── Center canvas ── */}
        <main
          className="flex-1 overflow-hidden relative flex flex-col"
          style={{
            backgroundColor: canvasMode === "preview" ? "#e5e7eb" : "#f9fafb",
          }}
        >
          {canvasMode === "blocks" ? (
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-2xl mx-auto py-8 px-4">
                {page.sections.length === 0 ? (
                  <div
                    className="flex flex-col items-center justify-center py-24 border-2 border-dashed rounded-xl text-center"
                    style={{ borderColor: colors.secondary }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDropTarget({ parentId: null, index: 0 });
                    }}
                    onDrop={(e) => handleDrop(e, 0, null)}
                    onDragLeave={() => setDropTarget(null)}
                  >
                    <div className="text-4xl mb-3 font-mono text-gray-400">
                      [+]
                    </div>
                    <p className="text-gray-500 font-medium mb-1">
                      No blocks yet
                    </p>
                    <p className="text-sm text-gray-400">
                      Drag a block from the left sidebar, or click one to add
                      it.
                    </p>
                  </div>
                ) : (
                  renderSectionList(page.sections, null, 0)
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Preview toolbar */}
              <div
                className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0 text-xs"
                style={{
                  borderColor: colors.secondary,
                  backgroundColor: colors.background,
                }}
              >
                <span className="font-mono text-gray-400 truncate flex-1">
                  /{page.slug || "(unsaved)"}
                </span>
                {hasUnsavedChanges && (
                  <span className="text-yellow-600 shrink-0">
                    Unsaved changes
                  </span>
                )}
                <button
                  onClick={handleSaveDraft}
                  disabled={saving || !page.slug}
                  className="shrink-0 px-2 py-1 rounded border hover:opacity-75 disabled:opacity-40"
                  style={{ borderColor: colors.primary, color: colors.primary }}
                >
                  {saving ? "Saving..." : "Save Draft"}
                </button>
                <button
                  onClick={() => setPreviewKey((k) => k + 1)}
                  className="shrink-0 px-2 py-1 rounded border hover:opacity-75"
                  style={{
                    borderColor: colors.secondary,
                    color: colors.textSecondary,
                  }}
                >
                  Reload
                </button>
              </div>
              {/* Scaled iframe */}
              {page.slug ? (
                <div className="flex-1 overflow-hidden relative">
                  <iframe
                    key={previewKey}
                    src={`/${page.slug}`}
                    title="Page preview"
                    style={{
                      border: "none",
                      width: "200%",
                      height: "200%",
                      transform: "scale(0.5)",
                      transformOrigin: "top left",
                      pointerEvents: "none",
                    }}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
                  Set a page slug first to preview the page.
                </div>
              )}
            </>
          )}
        </main>

        {/* ── Right slide-out edit panel ── */}
        {/* ── Right slide-out edit panel ── */}
        {activeSection && (
          <aside
            className="w-96 shrink-0 flex flex-col border-l overflow-y-auto"
            style={{
              borderColor: colors.secondary,
              backgroundColor: colors.background,
            }}
          >
            {/* Panel header */}
            <div
              className="flex items-center justify-between px-4 py-3 border-b shrink-0"
              style={{ borderColor: colors.secondary }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-mono font-bold"
                  style={{ color: activeMeta?.color }}
                >
                  {activeMeta?.icon}
                </span>
                <span
                  className="font-semibold text-sm"
                  style={{ color: colors.text }}
                >
                  {activeMeta?.label}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => moveSectionInPage(activeSection.id, "up")}
                  disabled={activeSiblingInfo?.isFirst}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                  title="Move up"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <path d="M6 2L1 9h10L6 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => moveSectionInPage(activeSection.id, "down")}
                  disabled={activeSiblingInfo?.isLast}
                  className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"
                  title="Move down"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <path d="M6 10L1 3h10L6 10z" />
                  </svg>
                </button>
                <button
                  onClick={() => deleteSectionFromPage(activeSection.id)}
                  className="p-1 rounded hover:bg-red-50 text-red-400 hover:text-red-600 ml-1"
                  title="Delete"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="currentColor"
                  >
                    <path
                      d="M2 2l8 8M10 2l-8 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => setActiveSectionId(null)}
                  className="p-1 rounded hover:bg-gray-100 ml-1 text-gray-400"
                  title="Close panel"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="currentColor"
                  >
                    <path
                      d="M2 2l10 10M12 2l-10 10"
                      stroke="currentColor"
                      strokeWidth="2"
                      fill="none"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Panel body */}
            <SectionEditorContext.Provider value={{ panelMode: true }}>
              {activeSection.type === "hero" && (
                <HeroEditor
                  section={activeSection}
                  onChange={(s) => updateSectionInPage(activeSection.id, s)}
                  onDelete={() => deleteSectionFromPage(activeSection.id)}
                  onMoveUp={() => moveSectionInPage(activeSection.id, "up")}
                  onMoveDown={() => moveSectionInPage(activeSection.id, "down")}
                  canMoveUp={!activeSiblingInfo?.isFirst}
                  canMoveDown={!activeSiblingInfo?.isLast}
                />
              )}
              {activeSection.type === "text" && (
                <TextEditor
                  section={activeSection}
                  onChange={(s) => updateSectionInPage(activeSection.id, s)}
                  onDelete={() => deleteSectionFromPage(activeSection.id)}
                  onMoveUp={() => moveSectionInPage(activeSection.id, "up")}
                  onMoveDown={() => moveSectionInPage(activeSection.id, "down")}
                  canMoveUp={!activeSiblingInfo?.isFirst}
                  canMoveDown={!activeSiblingInfo?.isLast}
                />
              )}
              {activeSection.type === "cardGrid" && (
                <CardGridEditor
                  section={activeSection}
                  onChange={(s) => updateSectionInPage(activeSection.id, s)}
                  onDelete={() => deleteSectionFromPage(activeSection.id)}
                  onMoveUp={() => moveSectionInPage(activeSection.id, "up")}
                  onMoveDown={() => moveSectionInPage(activeSection.id, "down")}
                  canMoveUp={!activeSiblingInfo?.isFirst}
                  canMoveDown={!activeSiblingInfo?.isLast}
                />
              )}
              {activeSection.type === "cta" && (
                <CtaEditor
                  section={activeSection}
                  onChange={(s) => updateSectionInPage(activeSection.id, s)}
                  onDelete={() => deleteSectionFromPage(activeSection.id)}
                  onMoveUp={() => moveSectionInPage(activeSection.id, "up")}
                  onMoveDown={() => moveSectionInPage(activeSection.id, "down")}
                  canMoveUp={!activeSiblingInfo?.isFirst}
                  canMoveDown={!activeSiblingInfo?.isLast}
                />
              )}
              {activeSection.type === "contentList" && (
                <ContentListEditor
                  section={activeSection}
                  onChange={(s) => updateSectionInPage(activeSection.id, s)}
                  onDelete={() => deleteSectionFromPage(activeSection.id)}
                  onMoveUp={() => moveSectionInPage(activeSection.id, "up")}
                  onMoveDown={() => moveSectionInPage(activeSection.id, "down")}
                  canMoveUp={!activeSiblingInfo?.isFirst}
                  canMoveDown={!activeSiblingInfo?.isLast}
                />
              )}
              {activeSection.type === "component" && (
                <ComponentSectionEditor
                  section={activeSection as ComponentSection}
                  onChange={(s) => updateSectionInPage(activeSection.id, s)}
                  onDelete={() => deleteSectionFromPage(activeSection.id)}
                  onMoveUp={() => moveSectionInPage(activeSection.id, "up")}
                  onMoveDown={() => moveSectionInPage(activeSection.id, "down")}
                  canMoveUp={!activeSiblingInfo?.isFirst}
                  canMoveDown={!activeSiblingInfo?.isLast}
                  token={token}
                  useGitHubAPI={useGitHubAPI}
                />
              )}
            </SectionEditorContext.Provider>

            {/* ── Style Overrides panel ── */}
            <StyleOverridePanel
              overrides={(activeSection as any).styleOverrides ?? {}}
              onChange={(ov: SectionStyleOverrides) =>
                updateSectionInPage(activeSection.id, {
                  ...activeSection,
                  styleOverrides: ov,
                } as Section)
              }
            />
          </aside>
        )}
      </div>
    </div>
  );
}

// ── Style Override Panel ──────────────────────────────────────────────────────

const THEME_COLOR_KEYS: ThemeColorKey[] = [
  "primary",
  "secondary",
  "background",
  "text",
  "textSecondary",
  "accent",
];
const THEME_FONT_KEYS: ThemeFontKey[] = ["heading", "body"];

interface StyleOverridePanelProps {
  overrides: SectionStyleOverrides;
  onChange: (ov: SectionStyleOverrides) => void;
}

function StyleOverridePanel({ overrides, onChange }: StyleOverridePanelProps) {
  const { colors, fonts, spacing } = useTheme();
  const [open, setOpen] = useState(false);
  const hasAny = Object.values(overrides).some(Boolean);

  const set = (key: keyof SectionStyleOverrides, value: string | undefined) =>
    onChange({ ...overrides, [key]: value || undefined });

  const clear = () => onChange({});

  const Row = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="py-1.5">
      <span
        className="block text-xs mb-1"
        style={{ color: colors.textSecondary }}
      >
        {label}
      </span>
      <div>{children}</div>
    </div>
  );

  const textInput = (key: keyof SectionStyleOverrides, placeholder: string) => (
    <input
      type="text"
      value={(overrides[key] as string) ?? ""}
      onChange={(e) => set(key, e.target.value)}
      placeholder={placeholder}
      className="w-full px-2 py-1 text-xs rounded border"
      style={{
        borderColor: colors.secondary,
        backgroundColor: colors.background,
        color: colors.text,
      }}
    />
  );

  const ColorSwatches = ({
    field,
  }: {
    field: "backgroundColor" | "textColor";
  }) => (
    <div className="flex flex-wrap gap-1.5 items-center">
      {THEME_COLOR_KEYS.map((key) => {
        const hex = (colors[key] || "").trim();
        if (!hex) return null;
        // Active when the stored value matches this swatch's hex
        const active = overrides[field] === hex;
        return (
          <button
            key={key}
            title={`${key}: ${hex}`}
            onClick={() => set(field, active ? "" : hex)}
            className="w-8 h-8 rounded border-2 transition-all"
            style={{
              backgroundColor: hex,
              borderColor: active ? colors.text : "#00000033",
              outline: active ? `2px solid ${hex}` : "none",
              outlineOffset: "2px",
            }}
          />
        );
      })}
      {overrides[field] && (
        <>
          <span
            className="text-xs font-mono"
            style={{ color: colors.textSecondary }}
          >
            {overrides[field]}
          </span>
          <button
            onClick={() => set(field, "")}
            className="text-xs px-1.5 rounded hover:opacity-80"
            style={{ color: colors.textSecondary }}
            title="Clear"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );

  const spacingKeys = Object.keys(spacing);

  return (
    <div className="border-t" style={{ borderColor: colors.secondary }}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold hover:opacity-80"
        style={{ color: colors.text }}
      >
        <div className="flex items-center gap-2">
          <span>[S] Styles</span>
          {hasAny && (
            <span
              className="px-1.5 py-0.5 rounded text-xs"
              style={{
                backgroundColor: colors.primary + "22",
                color: colors.primary,
              }}
            >
              overrides active
            </span>
          )}
        </div>
        <span style={{ color: colors.textSecondary }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-1">
          <Row label="Background color">
            <ColorSwatches field="backgroundColor" />
          </Row>
          <Row label="Background image">
            {textInput("backgroundImage", "https://...")}
          </Row>
          {overrides.backgroundImage && (
            <>
              <Row label="Bg size">
                <div className="flex gap-1">
                  {(["cover", "contain", "auto"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => set("backgroundSize", v)}
                      className="px-2 py-1 text-xs rounded border"
                      style={{
                        borderColor:
                          overrides.backgroundSize === v
                            ? colors.primary
                            : colors.secondary,
                        color:
                          overrides.backgroundSize === v
                            ? colors.primary
                            : colors.text,
                      }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label="Bg position">
                {textInput("backgroundPosition", "center")}
              </Row>
            </>
          )}
          <Row label="Text color">
            <ColorSwatches field="textColor" />
          </Row>
          <Row label="Font family">
            <div className="flex gap-1 flex-wrap">
              {THEME_FONT_KEYS.map((k) => {
                const fontValue = fonts[k];
                const active = overrides.fontFamily === fontValue;
                return (
                  <button
                    key={k}
                    onClick={() => set("fontFamily", active ? "" : fontValue)}
                    className="px-3 py-1 text-xs rounded border"
                    style={{
                      borderColor: active ? colors.primary : colors.secondary,
                      color: active ? colors.primary : colors.text,
                      fontFamily: fontValue,
                    }}
                  >
                    {k}
                  </button>
                );
              })}
              {overrides.fontFamily && (
                <button
                  onClick={() => set("fontFamily", "")}
                  className="text-xs px-1.5 hover:opacity-80"
                  style={{ color: colors.textSecondary }}
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>
          </Row>
          {spacingKeys.length > 0 ? (
            <>
              <Row label="Padding top">
                <div className="flex flex-wrap gap-1">
                  {spacingKeys.map((k) => {
                    const cssVal = spacing[k];
                    const active = overrides.paddingTop === cssVal;
                    return (
                      <button
                        key={k}
                        title={`${k}: ${cssVal}`}
                        onClick={() => set("paddingTop", active ? "" : cssVal)}
                        className="px-2 py-1 text-xs rounded border"
                        style={{
                          borderColor: active
                            ? colors.primary
                            : colors.secondary,
                          color: active ? colors.primary : colors.text,
                        }}
                      >
                        {k}
                      </button>
                    );
                  })}
                </div>
              </Row>
              <Row label="Padding bottom">
                <div className="flex flex-wrap gap-1">
                  {spacingKeys.map((k) => {
                    const cssVal = spacing[k];
                    const active = overrides.paddingBottom === cssVal;
                    return (
                      <button
                        key={k}
                        title={`${k}: ${cssVal}`}
                        onClick={() =>
                          set("paddingBottom", active ? "" : cssVal)
                        }
                        className="px-2 py-1 text-xs rounded border"
                        style={{
                          borderColor: active
                            ? colors.primary
                            : colors.secondary,
                          color: active ? colors.primary : colors.text,
                        }}
                      >
                        {k}
                      </button>
                    );
                  })}
                </div>
              </Row>
            </>
          ) : (
            <>
              <Row label="Padding top">
                {textInput("paddingTop", "e.g. 2rem")}
              </Row>
              <Row label="Padding bottom">
                {textInput("paddingBottom", "e.g. 4rem")}
              </Row>
            </>
          )}
          <Row label="Extra classes">
            {textInput("customClasses", "e.g. rounded-xl shadow-lg")}
          </Row>
          {hasAny && (
            <button
              onClick={clear}
              className="mt-2 w-full py-1 text-xs rounded border hover:opacity-80"
              style={{ borderColor: "#ef4444", color: "#ef4444" }}
            >
              Clear all style overrides
            </button>
          )}
        </div>
      )}
    </div>
  );
}
