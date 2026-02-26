/**
 * PageEditor.tsx
 * Wires together: EditorProvider + DndContext + Toolbar + Palette + Canvas + PropEditor.
 * Handles drag-end to insert nodes from palette or reorder on canvas.
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
import { useState } from "react";
import { EditorProvider, useEditor } from "./EditorContext";
import { EditorToolbar } from "./EditorToolbar";
import { EditorCanvas } from "./EditorCanvas";
import { ComponentPalette } from "./ComponentPalette";
import { PropEditor } from "./PropEditor";
import type {
  ComponentMeta,
  PageContent,
} from "../../../../cms/editor/layoutSchema";
import { createNode } from "../../../../cms/editor/layoutSchema";

// Load all component metadata eagerly
const metadataModules = import.meta.glob<{ default: ComponentMeta }>(
  "/cms/components/metadata/*.json",
  { eager: true },
);
const allComponentMeta: ComponentMeta[] = Object.values(metadataModules)
  .map((m) => m.default as ComponentMeta)
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name));

// ─── Inner editor (has access to EditorContext) ────────────────────────────

function EditorInner({
  token,
  onBack,
}: {
  token: string | null;
  onBack: () => void;
}) {
  const { dispatch } = useEditor();
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
      // Insert new node from palette
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
        <EditorToolbar token={token} onBack={onBack} />

        <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <ComponentPalette components={allComponentMeta} />
          <EditorCanvas />
          <PropEditor />
        </Box>
      </Box>

      {/* Drag overlay — ghost element while dragging */}
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
  // Load the page into context on first render
  useState(() => {
    dispatch({ type: "LOAD_PAGE", payload: initialPage });
  });
  return <EditorInner token={token} onBack={onBack} />;
}
