/**
 * PropEditor.tsx
 * Right panel — shows editable fields for the selected node's props.
 * mode="design"  → only structural/visual props (Layout tab)
 * mode="content" → only text/data props (Content tab)
 * mode="all"     → all props (default / back-compat)
 */
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useEditor, useUpdateProps } from "./EditorContext";
import { EventEditor } from "./EventEditor";
import { SlotManager } from "./SlotManager";
import { PropField, metaByComponentId } from "./PropField";
import {
  isDesignProp,
  isContentProp,
} from "../../../../cms/editor/layoutSchema";
import type { ComponentMeta } from "../../../../cms/editor/layoutSchema";

export type PropEditorMode = "design" | "content" | "all";

export function PropEditor({ mode = "all" }: { mode?: PropEditorMode }) {
  const { selectedNode } = useEditor();
  const updateProps = useUpdateProps(selectedNode?.id ?? "");

  if (!selectedNode) {
    return (
      <Box
        sx={{
          width: 260,
          flexShrink: 0,
          borderLeft: 1,
          borderColor: "divider",
          p: 2,
        }}
      >
        <Typography variant="body2" color="text.disabled">
          Select a component on the canvas to edit its properties.
        </Typography>
      </Box>
    );
  }

  const meta: ComponentMeta | undefined =
    metaByComponentId[selectedNode.componentId];

  // Filter props based on mode
  const propEntries = meta
    ? Object.entries(meta.props).filter(([key, propMeta]) => {
        if (mode === "design") return isDesignProp(key, propMeta);
        if (mode === "content") return isContentProp(key, propMeta);
        return true;
      })
    : [];

  return (
    <Box
      sx={{
        width: 260,
        flexShrink: 0,
        borderLeft: 1,
        borderColor: "divider",
        overflowY: "auto",
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="subtitle2">
          {meta?.name ?? selectedNode.componentId}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {selectedNode.id}
        </Typography>
      </Box>

      <Box sx={{ p: 2 }}>
        <Typography variant="overline">
          {mode === "design"
            ? "Design Props"
            : mode === "content"
              ? "Content Props"
              : "Props"}
        </Typography>
        {meta ? (
          propEntries.length > 0 ? (
            propEntries.map(([key, propMeta]) => (
              <PropField
                key={key}
                name={key}
                meta={propMeta}
                value={selectedNode.props[key] ?? propMeta.default}
                onChange={(val) => updateProps({ [key]: val })}
              />
            ))
          ) : (
            <Typography variant="body2" color="text.disabled" sx={{ mt: 1 }}>
              No {mode} props for this component.
            </Typography>
          )
        ) : (
          <Typography variant="body2" color="text.disabled">
            No metadata found.
          </Typography>
        )}
      </Box>

      {mode !== "content" && meta && Object.keys(meta.events).length > 0 && (
        <>
          <Divider />
          <EventEditor node={selectedNode} meta={meta} />
        </>
      )}

      {mode !== "content" && meta && Object.keys(meta.slots).length > 0 && (
        <SlotManager node={selectedNode} meta={meta} />
      )}
    </Box>
  );
}
