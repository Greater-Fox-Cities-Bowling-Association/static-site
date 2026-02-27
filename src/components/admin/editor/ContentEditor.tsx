/**
 * ContentEditor.tsx
 * Content tab — walks every component on the page and presents only
 * text/link/image props as editable form fields.
 * No canvas, no drag-and-drop — pure content authoring.
 */
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useEditor } from "./EditorContext";
import { PropField, metaByComponentId } from "./PropField";
import { isContentProp } from "../../../../cms/editor/layoutSchema";
import type { LayoutNode } from "../../../../cms/editor/layoutSchema";

// ─── Per-node card ────────────────────────────────────────────────────────

interface NodeCardProps {
  node: LayoutNode;
  depth?: number;
}

function NodeCard({ node, depth = 0 }: NodeCardProps) {
  const { dispatch } = useEditor();
  const meta = metaByComponentId[node.componentId];

  const contentEntries = meta
    ? Object.entries(meta.props).filter(([key, propMeta]) =>
        isContentProp(key, propMeta),
      )
    : [];

  // First string content prop value as a preview snippet
  const previewValue = contentEntries
    .map(([key]) => node.props[key])
    .find((v) => typeof v === "string" && (v as string).length > 0) as
    | string
    | undefined;

  function updateProp(key: string, val: unknown) {
    dispatch({
      type: "UPDATE_PROPS",
      payload: { nodeId: node.id, props: { [key]: val } },
    });
  }

  return (
    <Box sx={{ ml: depth * 3, mb: 1 }}>
      <Accordion
        disableGutters
        elevation={depth === 0 ? 2 : 0}
        sx={{
          border: 1,
          borderColor: depth === 0 ? "divider" : "grey.200",
          borderRadius: `${depth === 0 ? 2 : 1}px !important`,
          "&:before": { display: "none" },
        }}
      >
        <AccordionSummary
          expandIcon={<ExpandMoreIcon fontSize="small" />}
          sx={{ minHeight: 44, "& .MuiAccordionSummary-content": { my: 0.5 } }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flex: 1,
              overflow: "hidden",
            }}
          >
            {/* Material Icon */}
            <Box
              component="span"
              className="material-icons"
              sx={{ fontSize: 18, color: "primary.main", flexShrink: 0 }}
            >
              {meta?.editor?.icon ?? "widgets"}
            </Box>

            <Typography
              variant="body2"
              fontWeight={600}
              noWrap
              sx={{ minWidth: 80 }}
            >
              {meta?.name ?? node.componentId}
            </Typography>

            {contentEntries.length === 0 && (
              <Chip
                label="no content"
                size="small"
                sx={{ fontSize: 10, height: 18 }}
              />
            )}

            {previewValue && (
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                sx={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}
              >
                {previewValue}
              </Typography>
            )}
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ pt: 1, pb: 2, px: 2 }}>
          {contentEntries.length > 0 ? (
            contentEntries.map(([key, propMeta]) => (
              <PropField
                key={key}
                name={key}
                meta={propMeta}
                value={node.props[key] ?? propMeta.default}
                onChange={(val) => updateProp(key, val)}
              />
            ))
          ) : (
            <Typography variant="body2" color="text.disabled">
              This component has no editable content — its values are controlled
              by design props (spacing, colors, layout). Use the{" "}
              <strong>Layout</strong> tab to adjust it.
            </Typography>
          )}

          {/* Recursively render slot children */}
          {Object.entries(node.slots).map(([slotName, children]) =>
            children.length > 0 ? (
              <Box key={slotName} sx={{ mt: 2 }}>
                {Object.keys(node.slots).length > 1 && (
                  <Typography
                    variant="overline"
                    color="text.secondary"
                    sx={{ mb: 0.5, display: "block" }}
                  >
                    Slot: {slotName}
                  </Typography>
                )}
                {children.map((child) => (
                  <NodeCard key={child.id} node={child} depth={depth + 1} />
                ))}
              </Box>
            ) : null,
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

// ─── Public component ─────────────────────────────────────────────────────

export function ContentEditor() {
  const { state } = useEditor();
  const nodes = state.page?.layout ?? [];

  if (nodes.length === 0) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "text.disabled",
          p: 4,
        }}
      >
        <Typography variant="body1">
          No components on this page yet. Switch to the <strong>Layout</strong>{" "}
          tab to add components first.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flex: 1,
        overflowY: "auto",
        p: 3,
        bgcolor: "grey.50",
      }}
    >
      <Typography variant="h6" gutterBottom>
        Page Content
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Edit the text, links, and media for each component on this page.
        Structural choices (colours, spacing, layout) live in the{" "}
        <strong>Layout</strong> tab.
      </Typography>

      {nodes.map((node) => (
        <NodeCard key={node.id} node={node} />
      ))}
    </Box>
  );
}
