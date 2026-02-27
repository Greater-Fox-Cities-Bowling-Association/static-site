/**
 * PageEditor.tsx
 * 3-tab page editor:
 *   Layout  — drag-and-drop template builder + design props
 *   Content — form-based content authoring for every component
 *   Preview — full-width chrome-free page render
 */
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import Box from "@mui/material/Box";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import { useState } from "react";
import { EditorProvider, useEditor } from "./EditorContext";
import { EditorToolbar } from "./EditorToolbar";
import { EditorCanvas } from "./EditorCanvas";
import { ComponentPalette } from "./ComponentPalette";
import { PropEditor } from "./PropEditor";
import { ContentEditor } from "./ContentEditor";
import { PagePreview } from "./PagePreview";
import { allComponentMeta } from "./PropField";
import type { PageContent } from "../../../../cms/editor/layoutSchema";
import { createNode } from "../../../../cms/editor/layoutSchema";

type EditorTab = "layout" | "content" | "preview";

// ─── Inner editor (has access to EditorContext) ────────────────────────────

function EditorInner({
  token,
  onBack,
}: {
  token: string | null;
  onBack: () => void;
}) {
  const { dispatch } = useEditor();
  const [activeTab, setActiveTab] = useState<EditorTab>("layout");
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragId(null);
    const { active, over } = event;
    if (!over) return;

    const source = active.data.current as
      | { source: string; componentId?: string; nodeId?: string }
      | undefined;
    const target = over.data.current as
      | { parentId: string | null; slotName: string; index?: number }
      | undefined;

    if (!source || !target) return;

    if (source.source === "palette" && source.componentId) {
      const meta = allComponentMeta.find((m) => m.id === source.componentId);
      if (!meta) return;
      const node = createNode(meta);
      dispatch({
        type: "ADD_NODE",
        payload: {
          node,
          parentId: target.parentId,
          slotName: target.slotName ?? "children",
          index: target.index,
        },
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e) => setActiveDragId(String(e.active.id))}
      onDragEnd={handleDragEnd}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        {/* ── Top bar: toolbar + tab switcher ── */}
        <EditorToolbar token={token} onBack={onBack} />

        <Box
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            flexShrink: 0,
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v as EditorTab)}
            sx={{
              minHeight: 38,
              "& .MuiTab-root": { minHeight: 38, fontSize: 13 },
            }}
          >
            <Tab
              value="layout"
              label="Layout"
              icon={
                <Box
                  component="span"
                  className="material-icons"
                  sx={{ fontSize: 16, mr: 0.5 }}
                >
                  dashboard
                </Box>
              }
              iconPosition="start"
            />
            <Tab
              value="content"
              label="Content"
              icon={
                <Box
                  component="span"
                  className="material-icons"
                  sx={{ fontSize: 16, mr: 0.5 }}
                >
                  edit_note
                </Box>
              }
              iconPosition="start"
            />
            <Tab
              value="preview"
              label="Preview"
              icon={
                <Box
                  component="span"
                  className="material-icons"
                  sx={{ fontSize: 16, mr: 0.5 }}
                >
                  visibility
                </Box>
              }
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {/* ── Tab panels ── */}
        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          {/* Layout tab */}
          {activeTab === "layout" && (
            <>
              <ComponentPalette components={allComponentMeta} />
              <EditorCanvas />
              <PropEditor mode="design" />
            </>
          )}

          {/* Content tab */}
          {activeTab === "content" && <ContentEditor />}

          {/* Preview tab */}
          {activeTab === "preview" && <PagePreview />}
        </Box>
      </Box>

      {/* Drag overlay — only matters in Layout tab */}
      <DragOverlay>
        {activeDragId ? (
          <Box
            sx={{
              p: 1,
              bgcolor: "primary.light",
              color: "primary.contrastText",
              borderRadius: 1,
              fontSize: 12,
              pointerEvents: "none",
            }}
          >
            {activeDragId.replace("palette-", "")}
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ─── Public component ──────────────────────────────────────────────────────

interface Props {
  initialPage: PageContent;
  token: string | null;
  onBack: () => void;
}

export function PageEditor({ initialPage, token, onBack }: Props) {
  return (
    <EditorProvider>
      <EditorLoader initialPage={initialPage} token={token} onBack={onBack} />
    </EditorProvider>
  );
}

function EditorLoader({ initialPage, token, onBack }: Props) {
  const { dispatch } = useEditor();
  useState(() => {
    dispatch({ type: "LOAD_PAGE", payload: initialPage });
  });
  return <EditorInner token={token} onBack={onBack} />;
}
