/**
 * ComponentPalette.tsx
 * Left sidebar listing all registered components grouped by category.
 * Drag a component from here onto the canvas to insert a new node.
 */
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import Paper from "@mui/material/Paper";
import Divider from "@mui/material/Divider";
import { useDraggable } from "@dnd-kit/core";
import type { ComponentMeta } from "../../../../cms/editor/layoutSchema";

interface PaletteItemProps {
  meta: ComponentMeta;
}

function PaletteItem({ meta }: PaletteItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${meta.id}`,
    data: { source: "palette", componentId: meta.id },
  });

  return (
    <Tooltip title={meta.name} placement="right">
      <Paper
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        variant="outlined"
        sx={{
          p: 1,
          display: "flex",
          alignItems: "center",
          gap: 1,
          cursor: "grab",
          opacity: isDragging ? 0.4 : 1,
          "&:hover": { bgcolor: "action.hover" },
          userSelect: "none",
        }}
      >
        <Box
          component="span"
          className="material-icons"
          sx={{
            fontSize: 20,
            color: "primary.main",
            fontFamily: "Material Icons",
          }}
        >
          {meta.editor.icon}
        </Box>
        <Typography variant="body2" noWrap>
          {meta.name}
        </Typography>
      </Paper>
    </Tooltip>
  );
}

interface Props {
  components: ComponentMeta[];
}

export function ComponentPalette({ components }: Props) {
  const primitives = components.filter((c) => c.category === "primitive");
  const composites = components.filter((c) => c.category === "composite");
  const userDefined = components.filter((c) => c.category === "user-defined");

  return (
    <Box
      sx={{
        width: 200,
        flexShrink: 0,
        overflowY: "auto",
        borderRight: 1,
        borderColor: "divider",
        p: 1,
      }}
    >
      <Typography variant="overline" sx={{ px: 1 }}>
        Primitives
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 2 }}>
        {primitives.map((m) => (
          <PaletteItem key={m.id} meta={m} />
        ))}
      </Box>

      <Divider sx={{ my: 1 }} />
      <Typography variant="overline" sx={{ px: 1 }}>
        Composites
      </Typography>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 2 }}>
        {composites.map((m) => (
          <PaletteItem key={m.id} meta={m} />
        ))}
      </Box>

      {userDefined.length > 0 && (
        <>
          <Divider sx={{ my: 1 }} />
          <Typography variant="overline" sx={{ px: 1 }}>
            My Components
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {userDefined.map((m) => (
              <PaletteItem key={m.id} meta={m} />
            ))}
          </Box>
        </>
      )}
    </Box>
  );
}
