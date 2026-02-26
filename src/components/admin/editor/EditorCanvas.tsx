/**
 * EditorCanvas.tsx
 * Droppable canvas that renders the live page using ComponentRenderer.
 * Each node is wrapped in a clickable selection overlay.
 * Supports dropping from palette (insert) and reordering within the canvas.
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

// ─── Drop zone for top-level canvas ───────────────────────────────────────

function CanvasDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas-root",
    data: { parentId: null, slotName: "children" },
  });
  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: 120,
        border: "2px dashed",
        borderColor: isOver ? "primary.main" : "divider",
        borderRadius: 1,
        p: 2,
        bgcolor: isOver ? "action.hover" : "background.default",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mt: 2,
      }}
    >
      <Typography variant="body2" color="text.disabled">
        Drop components here to add them to the page
      </Typography>
    </Box>
  );
}

// ─── Node wrapper (selection highlight + delete) ───────────────────────────

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
      onClick={(e) => {
        e.stopPropagation();
        dispatch({ type: "SELECT_NODE", payload: node.id });
      }}
      sx={{
        position: "relative",
        outline: isSelected ? "2px solid" : "1px dashed",
        outlineColor: isSelected ? "primary.main" : "transparent",
        "&:hover": {
          outlineColor: isSelected ? "primary.main" : "primary.light",
        },
        cursor: "pointer",
        mb: 0.5,
      }}
    >
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
          <Tooltip title="Delete node">
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

  return (
    <Box
      sx={{ flex: 1, overflowY: "auto", p: 2 }}
      onClick={() => dispatch({ type: "SELECT_NODE", payload: null })}
    >
      {/* Scale wrapper */}
      <Box
        sx={{
          transformOrigin: "top left",
          transform: scale !== 1 ? `scale(${scale})` : undefined,
          width: scale !== 1 ? `${100 / scale}%` : "100%",
        }}
      >
        <ThemeProvider theme={previewTheme}>
          <CssBaseline />
          {state.page.layout.map((node) => (
            <ComponentRenderer
              key={node.id}
              node={node}
              wrapNode={(n, el) => (
                <NodeWrapper key={n.id} node={n}>
                  {el}
                </NodeWrapper>
              )}
            />
          ))}
        </ThemeProvider>

        {state.page.layout.length === 0 && <CanvasDropZone />}
      </Box>
    </Box>
  );
}
