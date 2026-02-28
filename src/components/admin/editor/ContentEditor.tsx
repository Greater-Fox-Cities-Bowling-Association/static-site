/**
 * ContentEditor.tsx
 * Content tab — walks every component on the page as an accordion.
 * Each card has its own Form / JSON toggle in the header:
 *   Form — friendly PropField widgets + CSV import for collection slots
 *   JSON — editable raw props JSON for that component with Copy / Apply
 */
import { useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DataObjectIcon from "@mui/icons-material/DataObject";
import ListAltIcon from "@mui/icons-material/ListAlt";
import { useEditor } from "./EditorContext";
import { ChildCsvDialog } from "./ChildCsvDialog";
import { PropField, metaByComponentId } from "./PropField";
import { isContentProp } from "../../../../cms/editor/layoutSchema";
import type { LayoutNode } from "../../../../cms/editor/layoutSchema";

// ─── Per-node form card ───────────────────────────────────────────────────

interface NodeCardProps {
  node: LayoutNode;
  depth?: number;
}

function NodeCard({ node, depth = 0 }: NodeCardProps) {
  const { dispatch } = useEditor();
  const meta = metaByComponentId[node.componentId];

  // Per-card view toggle: "form" or "json"
  const [cardView, setCardView] = useState<"form" | "json">("form");
  // JSON editing draft for this node's props
  const [jsonDraft, setJsonDraft] = useState<string | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);
  // CSV dialog state — tracks which slot is currently open for CSV import
  const [csvSlot, setCsvSlot] = useState<string | null>(null);

  const contentEntries = meta
    ? Object.entries(meta.props).filter(([key, propMeta]) =>
        isContentProp(key, propMeta),
      )
    : [];

  const slotEntries = meta ? Object.entries(meta.slots) : [];
  const isCollection = slotEntries.length > 0;

  // First non-empty string content prop as summary preview
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
          sx={{
            minHeight: 44,
            "& .MuiAccordionSummary-content": { my: 0.5, mr: 1 },
          }}
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

            {isCollection && (
              <Chip
                label="collection"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ fontSize: 10, height: 18 }}
              />
            )}

            {contentEntries.length === 0 && !isCollection && (
              <Chip
                label="layout only"
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

            {/* Form / JSON toggle — stop propagation so it doesn't toggle the accordion */}
            <ToggleButtonGroup
              value={cardView}
              exclusive
              size="small"
              onChange={(e, v) => {
                if (!v) return;
                e.stopPropagation();
                setCardView(v);
                setJsonDraft(null);
                setJsonError(null);
              }}
              onClick={(e) => e.stopPropagation()}
              sx={{ ml: "auto", flexShrink: 0, height: 24 }}
            >
              <ToggleButton
                value="form"
                sx={{ px: 1, py: 0, fontSize: 11, gap: 0.5 }}
              >
                <ListAltIcon sx={{ fontSize: 13 }} /> Form
              </ToggleButton>
              <ToggleButton
                value="json"
                sx={{ px: 1, py: 0, fontSize: 11, gap: 0.5 }}
              >
                <DataObjectIcon sx={{ fontSize: 13 }} /> JSON
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </AccordionSummary>

        <AccordionDetails sx={{ pt: 1, pb: 2, px: 2 }}>
          {/* ── JSON view for this node ── */}
          {cardView === "json" ? (
            <NodeJsonEditor
              node={node}
              draft={jsonDraft}
              error={jsonError}
              onChange={(v) => {
                setJsonDraft(v);
                setJsonError(null);
              }}
              onApply={() => {
                try {
                  const parsed = JSON.parse(jsonDraft!);
                  if (typeof parsed !== "object" || Array.isArray(parsed))
                    throw new Error("Expected a JSON object.");
                  dispatch({
                    type: "UPDATE_PROPS",
                    payload: {
                      nodeId: node.id,
                      props: parsed as Record<string, unknown>,
                    },
                  });
                  setJsonDraft(null);
                  setJsonError(null);
                } catch (e) {
                  setJsonError(`Invalid JSON — ${(e as Error).message}`);
                }
              }}
              onCopy={() =>
                navigator.clipboard
                  .writeText(jsonDraft ?? JSON.stringify(node.props, null, 2))
                  .catch(() => {})
              }
            />
          ) : (
            <>
              {/* ── Form: content prop fields ── */}
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
              ) : !isCollection ? (
                <Typography variant="body2" color="text.disabled">
                  This component has no editable text content. Use the{" "}
                  <strong>Layout</strong> tab to adjust its appearance.
                </Typography>
              ) : null}

              {/* ── CSV import for collection slots ── */}
              {isCollection && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="overline" color="text.secondary">
                    Add items in bulk
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 0.5 }}
                  >
                    {slotEntries.map(([slotName]) => (
                      <Tooltip
                        key={slotName}
                        title={`Upload a CSV to add multiple items to the "${slotName}" slot at once`}
                      >
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<UploadFileIcon fontSize="small" />}
                          onClick={() => setCsvSlot(slotName)}
                          sx={{ textTransform: "none" }}
                        >
                          Import {slotName} via CSV
                        </Button>
                      </Tooltip>
                    ))}
                  </Box>

                  {/* One dialog per slot, each only opens when its slotName is active */}
                  {slotEntries.map(([slotName, slotMeta]) => (
                    <ChildCsvDialog
                      key={slotName}
                      open={csvSlot === slotName}
                      slotName={slotName}
                      allowedTypes={slotMeta.allowedTypes}
                      onClose={() => setCsvSlot(null)}
                      onConfirm={(nodes) => {
                        dispatch({
                          type: "BULK_ADD_NODES",
                          payload: { nodes, parentId: node.id, slotName },
                        });
                        setCsvSlot(null);
                      }}
                    />
                  ))}
                </>
              )}

              {/* ── Nested slot children ── */}
              {slotEntries.map(([slotName]) => {
                const children = node.slots[slotName] ?? [];
                if (children.length === 0) return null;
                return (
                  <Box key={slotName} sx={{ mt: 2 }}>
                    {slotEntries.length > 1 && (
                      <Typography
                        variant="overline"
                        color="text.secondary"
                        sx={{ mb: 0.5, display: "block" }}
                      >
                        {slotName} ({children.length})
                      </Typography>
                    )}
                    {children.map((child) => (
                      <NodeCard key={child.id} node={child} depth={depth + 1} />
                    ))}
                  </Box>
                );
              })}
            </>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}

// ─── Per-node JSON editor ─────────────────────────────────────────────────

interface NodeJsonEditorProps {
  node: LayoutNode;
  draft: string | null;
  error: string | null;
  onChange: (v: string) => void;
  onApply: () => void;
  onCopy: () => void;
}

function NodeJsonEditor({
  node,
  draft,
  error,
  onChange,
  onApply,
  onCopy,
}: NodeJsonEditorProps) {
  const text = draft ?? JSON.stringify(node.props, null, 2);
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          Edit props as JSON. Click <strong>Apply</strong> to save.
        </Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={onCopy}
          sx={{ textTransform: "none", fontSize: 11 }}
        >
          Copy
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={onApply}
          disabled={draft === null}
          sx={{ textTransform: "none", fontSize: 11 }}
        >
          Apply
        </Button>
      </Box>
      {error && (
        <Alert severity="error" sx={{ py: 0, fontSize: 12 }}>
          {error}
        </Alert>
      )}
      <Box
        component="textarea"
        value={text}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
          onChange(e.target.value)
        }
        spellCheck={false}
        rows={Math.min(20, text.split("\n").length + 1)}
        sx={{
          fontFamily: "monospace",
          fontSize: 11,
          lineHeight: 1.5,
          p: 1,
          width: "100%",
          border: "1px solid",
          borderColor: error ? "error.main" : "divider",
          borderRadius: 1,
          resize: "vertical",
          bgcolor: "grey.50",
          color: "text.primary",
          outline: "none",
          boxSizing: "border-box",
          "&:focus": { borderColor: "primary.main" },
        }}
      />
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
    <Box sx={{ flex: 1, overflowY: "auto", p: 3, bgcolor: "grey.50" }}>
      <Typography variant="h6" gutterBottom>
        Page Content
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Edit text, links, and images for each component. Use the{" "}
        <strong>Form</strong> / <strong>JSON</strong> toggle on each card to
        switch between a friendly form and raw props JSON. Components tagged{" "}
        <Chip
          label="collection"
          size="small"
          color="primary"
          variant="outlined"
          sx={{ fontSize: 10, height: 18, mx: 0.5 }}
        />{" "}
        also support bulk CSV import.
      </Typography>

      {nodes.map((node) => (
        <NodeCard key={node.id} node={node} />
      ))}
    </Box>
  );
}
