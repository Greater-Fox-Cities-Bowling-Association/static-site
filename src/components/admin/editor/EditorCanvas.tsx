/**
 * EditorCanvas.tsx
 * Droppable canvas — complete replacement.
 * See inline comments for change rationale.
 */
import { useDroppable } from "@dnd-kit/core";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import { useEditor } from "./EditorContext";
import { ComponentRenderer } from "../../renderer/ComponentRenderer";
import type { LayoutNode } from "../../../../cms/editor/layoutSchema";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

// ─── Empty canvas drop zone ────────────────────────────────────────────────

function CanvasDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: "between-0",
    data: { parentId: null, slotName: "children", index: 0 },
  });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: 160,
        border: "2px dashed",
        borderColor: isOver ? "primary.main" : "divider",
        borderRadius: 1,
        p: 2,
        m: 2,
        bgcolor: isOver ? "action.hover" : "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.15s",
      }}
    >
      <Typography variant="body2" color="text.disabled">
        Drag a component here to get started
      </Typography>
    </Box>
  );
}

// ─── Between-node drop zone ────────────────────────────────────────────────

function BetweenDropZone({ index }: { index: number }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `between-${index}`,
    data: { parentId: null, slotName: "children", index },
  });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        height: isOver ? 48 : 10,
        transition: "height 0.15s, opacity 0.15s, background-color 0.15s",
        borderRadius: 1,
        bgcolor: isOver ? "primary.light" : "transparent",
        border: "2px dashed",
        borderColor: isOver ? "primary.main" : "grey.300",
        opacity: isOver ? 1 : 0.5,
        mx: 0.5,
        my: 0.25,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isOver && (
        <Typography
          variant="caption"
          color="primary.dark"
          sx={{ pointerEvents: "none" }}
        >
          Drop here
        </Typography>
      )}
    </Box>
  );
}

// ─── Inside-slot drop zone ─────────────────────────────────────────────────

function SlotDropZone({
  parentId,
  slotName,
  index,
  isEmpty,
}: {
  parentId: string;
  slotName: string;
  index: number;
  isEmpty?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${parentId}-${slotName}-${index}`,
    data: { parentId, slotName, index },
  });

  if (isEmpty) {
    return (
      <Box
        ref={setNodeRef}
        sx={{
          minHeight: 48,
          border: "2px dashed",
          borderColor: isOver ? "primary.main" : "grey.300",
          borderRadius: 1,
          bgcolor: isOver ? "action.hover" : "background.default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s",
          p: 1,
          m: 0.5,
        }}
      >
        <Typography variant="caption" color="text.disabled">
          Drop into {slotName}
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      ref={setNodeRef}
      sx={{
        height: isOver ? 40 : 8,
        transition: "height 0.15s, opacity 0.15s",
        borderRadius: 1,
        bgcolor: isOver ? "primary.light" : "transparent",
        border: "2px dashed",
        borderColor: isOver ? "primary.main" : "grey.300",
        opacity: isOver ? 1 : 0.4,
        mx: 0.5,
        my: 0.25,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {isOver && (
        <Typography
          variant="caption"
          color="primary.dark"
          sx={{ pointerEvents: "none" }}
        >
          Drop here
        </Typography>
      )}
    </Box>
  );
}

// ─── Node wrapper ──────────────────────────────────────────────────────────

function NodeWrapper({
  node,
  children,
}: {
  node: LayoutNode;
  children: React.ReactNode;
}) {
  const { state, dispatch } = useEditor();
  const isSelected = state.selectedNodeId === node.id;

  return (
    <Box
      /**
       * Capture phase: preventDefault on <a> links to stop navigation.
       * Do NOT stopPropagation — child NodeWrappers still need this event.
       */
      onClickCapture={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("a")) {
          e.preventDefault();
        }
      }}
      /**
       * Bubble phase: stopPropagation so only the INNERMOST NodeWrapper
       * (most specific element clicked) selects itself.
       */
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: "SELECT_NODE", payload: node.id });
      }}
      sx={{
        position: "relative",
        outline: isSelected ? "2px solid" : "1px dashed",
        outlineColor: isSelected ? "primary.main" : "grey.300",
        "&:hover": {
          outlineColor: isSelected ? "primary.main" : "primary.light",
        },
        cursor: "default",
      }}
    >
      {/* Selection badge */}
      {isSelected && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            zIndex: 10,
            bgcolor: "primary.main",
            color: "primary.contrastText",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.25,
            fontSize: 11,
          }}
        >
          <Typography variant="caption" sx={{ color: "inherit" }}>
            {node.componentId}
          </Typography>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              sx={{ color: "inherit", p: 0.25 }}
              onClick={(e) => {
                e.stopPropagation();
                dispatch({ type: "REMOVE_NODE", payload: { nodeId: node.id } });
              }}
            >
              <DeleteIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
      {children}
    </Box>
  );
}

// ─── Canvas ───────────────────────────────────────────────────────────────

const previewTheme = createTheme();

interface Props {
  /** Scale factor for the preview, e.g. 0.75 */
  scale?: number;
}

export function EditorCanvas({ scale = 1 }: Props) {
  const { state, dispatch } = useEditor();

  if (!state.page) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography color="text.disabled">
          No page loaded. Open a page to start editing.
        </Typography>
      </Box>
    );
  }

  /** Wraps every rendered node with selection / deletion controls. */
  function wrapNode(n: LayoutNode, el: React.ReactNode): React.ReactNode {
    return (
      <NodeWrapper key={n.id} node={n}>
        {el}
      </NodeWrapper>
    );
  }

  /**
   * Replaces ComponentRenderer's default slot rendering.
   * Adds SlotDropZones between children so you can drop into any container.
   */
  function wrapSlot(
    parentNode: LayoutNode,
    slotName: string,
    children: LayoutNode[],
  ): React.ReactNode {
    if (children.length === 0) {
      return (
        <SlotDropZone
          parentId={parentNode.id}
          slotName={slotName}
          index={0}
          isEmpty
        />
      );
    }
    return (
      <>
        <SlotDropZone parentId={parentNode.id} slotName={slotName} index={0} />
        {children.map((child, i) => (
          <Box key={child.id}>
            <ComponentRenderer
              node={child}
              wrapNode={wrapNode}
              wrapSlot={wrapSlot}
            />
            <SlotDropZone
              parentId={parentNode.id}
              slotName={slotName}
              index={i + 1}
            />
          </Box>
        ))}
      </>
    );
  }

  return (
    <Box
      sx={{ flex: 1, overflowY: "auto", p: 2, bgcolor: "grey.100" }}
      onClick={() => dispatch({ type: "SELECT_NODE", payload: null })}
    >
      <Box
        sx={{
          transformOrigin: "top left",
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          width: scale !== 1 ? `${100 / scale}%` : "100%",
          bgcolor: "background.paper",
          minHeight: 400,
          boxShadow: 1,
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        <ThemeProvider theme={previewTheme}>
          <CssBaseline />
          {state.page.layout.length === 0 ? (
            <CanvasDropZone />
          ) : (
            <>
              {state.page.layout.map((node, i) => (
                <Box key={node.id}>
                  <BetweenDropZone index={i} />
                  <ComponentRenderer
                    node={node}
                    wrapNode={wrapNode}
                    wrapSlot={wrapSlot}
                  />
                </Box>
              ))}
              <BetweenDropZone index={state.page.layout.length} />
            </>
          )}
        </ThemeProvider>
      </Box>
    </Box>
  );
}
