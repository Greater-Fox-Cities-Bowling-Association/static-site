/**
 * SlotManager.tsx
 * Shown in PropEditor when a component has slots.
 * For each slot it renders:
 *   - A list of current child components (with type label + delete button)
 *   - An "Add" button → dropdown of allowed components
 *   - A "From CSV" button → ChildCsvDialog (generates N children from a CSV)
 */
import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import TableChartIcon from "@mui/icons-material/TableChart";
import { useEditor } from "./EditorContext";
import { ChildCsvDialog } from "./ChildCsvDialog";
import type {
  ComponentMeta,
  LayoutNode,
} from "../../../../cms/editor/layoutSchema";
import { createNode } from "../../../../cms/editor/layoutSchema";

// ─── Load all component metadata ──────────────────────────────────────────

const metadataModules = import.meta.glob<{ default: ComponentMeta }>(
  "/cms/components/metadata/*.json",
  { eager: true },
);
const allMeta: ComponentMeta[] = Object.values(metadataModules)
  .map((m) => m.default as ComponentMeta)
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name));

// ─── Helpers ──────────────────────────────────────────────────────────────

function getAllowedMeta(allowedTypes: string[]): ComponentMeta[] {
  if (allowedTypes.includes("*")) return allMeta;
  return allMeta.filter((m) =>
    allowedTypes.some(
      (t) =>
        t.toLowerCase() === m.id || t.toLowerCase() === m.name.toLowerCase(),
    ),
  );
}

// ─── Props ────────────────────────────────────────────────────────────────

interface Props {
  node: LayoutNode;
  meta: ComponentMeta;
}

// ─── Component ────────────────────────────────────────────────────────────

export function SlotManager({ node, meta }: Props) {
  const { dispatch } = useEditor();

  const [menuState, setMenuState] = useState<{
    anchor: HTMLElement | null;
    slotName: string;
  }>({ anchor: null, slotName: "" });

  const [csvDialog, setCsvDialog] = useState<{
    open: boolean;
    slotName: string;
    allowedTypes: string[];
  }>({ open: false, slotName: "", allowedTypes: [] });

  if (!meta.slots || Object.keys(meta.slots).length === 0) return null;

  // ─── Handlers ───────────────────────────────────────────────────────────

  function handleAddChild(slotName: string, componentId: string) {
    const childMeta = allMeta.find((m) => m.id === componentId);
    if (!childMeta) return;
    dispatch({
      type: "ADD_NODE",
      payload: {
        node: createNode(childMeta),
        parentId: node.id,
        slotName,
        index: undefined, // append to end
      },
    });
    setMenuState({ anchor: null, slotName: "" });
  }

  function handleDeleteChild(nodeId: string) {
    dispatch({ type: "REMOVE_NODE", payload: { nodeId } });
  }

  function handleBulkAdd(nodes: LayoutNode[]) {
    dispatch({
      type: "BULK_ADD_NODES",
      payload: {
        nodes,
        parentId: node.id,
        slotName: csvDialog.slotName,
      },
    });
    setCsvDialog({ open: false, slotName: "", allowedTypes: [] });
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  const activeMenuSlotMeta =
    menuState.slotName && meta.slots[menuState.slotName]
      ? meta.slots[menuState.slotName]
      : { allowedTypes: ["*"], max: 50 };

  return (
    <>
      <Divider />
      <Box sx={{ p: 2 }}>
        <Typography variant="overline">Slots</Typography>

        {Object.entries(meta.slots).map(([slotName, slotMeta]) => {
          const children: LayoutNode[] = node.slots[slotName] ?? [];
          const atMax = children.length >= slotMeta.max;

          return (
            <Box key={slotName} sx={{ mb: 2 }}>
              {/* ── Slot header ──────────────────────────────────────── */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  mb: 0.75,
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ flex: 1, textTransform: "capitalize", fontWeight: 600 }}
                >
                  {slotName}
                </Typography>

                <Chip
                  label={`${children.length} / ${slotMeta.max}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: 10, height: 18, mr: 0.5 }}
                />

                <Tooltip
                  title={
                    atMax ? "Slot is full" : `Add a component to ${slotName}`
                  }
                >
                  <span>
                    <IconButton
                      size="small"
                      disabled={atMax}
                      onClick={(e) =>
                        setMenuState({ anchor: e.currentTarget, slotName })
                      }
                    >
                      <AddIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </span>
                </Tooltip>

                <Tooltip title="Add multiple children from a CSV file">
                  <IconButton
                    size="small"
                    onClick={() =>
                      setCsvDialog({
                        open: true,
                        slotName,
                        allowedTypes: slotMeta.allowedTypes,
                      })
                    }
                  >
                    <TableChartIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </Box>

              {/* ── Children list ────────────────────────────────────── */}
              {children.length === 0 ? (
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ display: "block", pl: 0.5, fontStyle: "italic" }}
                >
                  Empty — drag here or use Add / CSV
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.4,
                  }}
                >
                  {children.map((child, idx) => (
                    <Box
                      key={child.id}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        bgcolor: "grey.50",
                        borderRadius: 0.75,
                        px: 1,
                        py: 0.4,
                        border: "1px solid",
                        borderColor: "divider",
                        gap: 0.5,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ minWidth: 16, fontSize: 10 }}
                      >
                        {idx + 1}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ flex: 1, fontFamily: "monospace", fontSize: 11 }}
                      >
                        {child.componentId}
                      </Typography>
                      {/* Show first string-ish prop as a preview hint */}
                      {(() => {
                        const preview = Object.values(child.props).find(
                          (v) => typeof v === "string" && String(v).length > 0,
                        );
                        return preview ? (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            noWrap
                            sx={{
                              maxWidth: 80,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              fontSize: 10,
                            }}
                          >
                            {String(preview).slice(0, 24)}
                          </Typography>
                        ) : null;
                      })()}
                      <Tooltip title="Remove this child">
                        <IconButton
                          size="small"
                          sx={{ p: 0.25, flexShrink: 0 }}
                          onClick={() => handleDeleteChild(child.id)}
                        >
                          <DeleteIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}
                </Box>
              )}

              {/* ── Allowed types hint ───────────────────────────────── */}
              {slotMeta.allowedTypes[0] !== "*" && (
                <Typography
                  variant="caption"
                  color="text.disabled"
                  sx={{ display: "block", mt: 0.5, fontSize: 10 }}
                >
                  Allowed: {slotMeta.allowedTypes.join(", ")}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {/* ── Add component dropdown menu ─────────────────────────────────── */}
      <Menu
        anchorEl={menuState.anchor}
        open={!!menuState.anchor}
        onClose={() => setMenuState({ anchor: null, slotName: "" })}
        PaperProps={{ sx: { maxHeight: 320, minWidth: 160 } }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ px: 2, pt: 0.5, pb: 0.25, display: "block" }}
        >
          Add to: {menuState.slotName}
        </Typography>
        <Divider />
        {getAllowedMeta(activeMenuSlotMeta.allowedTypes).map((m) => (
          <MenuItem
            key={m.id}
            dense
            onClick={() => handleAddChild(menuState.slotName, m.id)}
          >
            <Box
              component="span"
              className="material-icons"
              sx={{ fontSize: 16, mr: 1, color: "text.secondary" }}
            >
              {m.editor.icon}
            </Box>
            {m.name}
          </MenuItem>
        ))}
      </Menu>

      {/* ── CSV import dialog ───────────────────────────────────────────── */}
      <ChildCsvDialog
        open={csvDialog.open}
        slotName={csvDialog.slotName}
        allowedTypes={csvDialog.allowedTypes}
        onClose={() =>
          setCsvDialog({ open: false, slotName: "", allowedTypes: [] })
        }
        onConfirm={handleBulkAdd}
      />
    </>
  );
}
