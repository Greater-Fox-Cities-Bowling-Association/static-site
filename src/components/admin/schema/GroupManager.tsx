/**
 * GroupManager.tsx
 * Drag-and-drop board for assigning content models (CmsSchema) to groups.
 *
 * Each group appears as a column. Schemas are draggable cards that can be
 * moved between columns. Changes are committed to GitHub on Save.
 */
import { useEffect, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import CategoryIcon from "@mui/icons-material/Category";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EditIcon from "@mui/icons-material/Edit";
import SearchIcon from "@mui/icons-material/Search";
import { commitFiles } from "../../../../cms/github/github";
import { listSchemas } from "../../../../cms/github/githubSchemas";
import type { CmsSchema } from "../../../../cms/types";

const REPO = import.meta.env.PUBLIC_GITHUB_REPO as string;
const BRANCH = import.meta.env.PUBLIC_GITHUB_BRANCH as string;
const UNGROUPED = "__ungrouped__";
const COL_WIDTH = 272;

interface Props {
  token: string | null;
  /** Called after a successful save so the sidebar can refresh. */
  onSaved?: () => void;
}

// ─── Draggable schema card ────────────────────────────────────────────────────

interface CardProps {
  schema: CmsSchema;
  ghost?: boolean;
}

function SchemaCard({ schema, ghost = false }: CardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: schema.id,
  });

  return (
    <Paper
      ref={setNodeRef}
      elevation={ghost ? 6 : isDragging ? 0 : 1}
      sx={{
        mb: 1,
        p: 1.25,
        display: "flex",
        alignItems: "center",
        gap: 1,
        borderRadius: 2,
        bgcolor: ghost ? "#fff" : isDragging ? "rgba(255,255,255,0.3)" : "#fff",
        opacity: isDragging ? 0.35 : 1,
        cursor: "grab",
        border: "1px solid",
        borderColor: ghost ? "primary.light" : "grey.200",
        boxShadow: ghost ? "0 8px 24px rgba(0,0,0,0.18)" : undefined,
        transition: "opacity 0.15s",
        userSelect: "none",
      }}
      {...attributes}
      {...listeners}
    >
      <DragIndicatorIcon
        sx={{ fontSize: 16, color: "text.disabled", flexShrink: 0 }}
      />
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: 1.5,
          bgcolor: "#f0fdf4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <CategoryIcon sx={{ fontSize: 15, color: "success.main" }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          noWrap
          sx={{ fontSize: 13 }}
        >
          {schema.name}
        </Typography>
        <Typography
          variant="caption"
          color="text.secondary"
          noWrap
          sx={{ fontSize: 10 }}
        >
          {schema.id}
        </Typography>
      </Box>
    </Paper>
  );
}

// ─── Droppable column ─────────────────────────────────────────────────────────

interface ColumnProps {
  id: string;
  label: string;
  schemas: CmsSchema[];
  isUngrouped?: boolean;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
}

function GroupColumn({
  id,
  label,
  schemas,
  isUngrouped = false,
  onRename,
  onDelete,
}: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  function commitRename() {
    const v = editVal.trim();
    if (v && v !== label) onRename?.(v);
    setEditing(false);
  }

  function startEdit() {
    setEditVal(label);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  }

  return (
    // Attach droppable ref to the ENTIRE column so any drop inside registers
    <Box
      ref={setNodeRef}
      sx={{
        width: COL_WIDTH,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Column header */}
      <Box
        sx={{
          mb: 1,
          px: 1,
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          height: 36,
        }}
      >
        {editing ? (
          <>
            <TextField
              inputRef={inputRef}
              value={editVal}
              onChange={(e) => setEditVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") setEditing(false);
              }}
              size="small"
              variant="standard"
              autoFocus
              sx={{ flex: 1, "& input": { fontWeight: 700, fontSize: 13 } }}
            />
            <IconButton size="small" onClick={commitRename} color="primary">
              <CheckIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" onClick={() => setEditing(false)}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </>
        ) : (
          <>
            <Typography
              variant="overline"
              sx={{
                fontWeight: 700,
                fontSize: 11,
                letterSpacing: 0.8,
                color: isUngrouped ? "text.disabled" : "primary.dark",
                flex: 1,
                lineHeight: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {label}
            </Typography>
            <Chip
              label={schemas.length}
              size="small"
              sx={{
                height: 17,
                fontSize: 10,
                "& .MuiChip-label": { px: 0.7 },
              }}
            />
            {!isUngrouped && (
              <>
                <Tooltip title="Rename group">
                  <IconButton
                    size="small"
                    onClick={startEdit}
                    sx={{ ml: 0.25 }}
                  >
                    <EditIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete group (moves schemas to Ungrouped)">
                  <IconButton size="small" onClick={onDelete} color="error">
                    <DeleteOutlineIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                </Tooltip>
              </>
            )}
          </>
        )}
      </Box>

      {/* Drop zone — visual styling only; the outer Box is the actual droppable */}
      <Box
        sx={{
          flex: 1,
          minHeight: 120,
          borderRadius: 3,
          border: "2px dashed",
          borderColor: isOver ? "primary.main" : "grey.200",
          bgcolor: isOver ? "rgba(37,99,235,0.05)" : "#f8fafc",
          p: 1,
          transition: "border-color 0.15s, background-color 0.15s",
        }}
      >
        {schemas.length === 0 && (
          <Typography
            variant="caption"
            color="text.disabled"
            sx={{
              display: "block",
              textAlign: "center",
              pt: 3,
              userSelect: "none",
            }}
          >
            Drop here
          </Typography>
        )}
        {schemas.map((s) => (
          <SchemaCard key={s.id} schema={s} />
        ))}
      </Box>
    </Box>
  );
}

// ─── GroupManager ─────────────────────────────────────────────────────────────

export function GroupManager({ token, onSaved }: Props) {
  const [schemas, setSchemas] = useState<CmsSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  // Local ordered list of named groups
  const [groups, setGroups] = useState<string[]>([]);
  // Maps schemaId → current group name ("" = ungrouped)
  const [groupOf, setGroupOf] = useState<Record<string, string>>({});
  // Baseline snapshot of groupOf at last load/save — used to compute changedCount
  const [savedGroupOf, setSavedGroupOf] = useState<Record<string, string>>({});

  const [search, setSearch] = useState("");

  // Currently dragging
  const [activeSchema, setActiveSchema] = useState<CmsSchema | null>(null);

  // Add group dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [addError, setAddError] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  async function load() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const list = await listSchemas(token, REPO, BRANCH);
      setSchemas(list);
      // Derive group order from groups present on schemas (sorted)
      const seen = new Set<string>();
      const grps: string[] = [];
      for (const s of list) {
        const g = s.group?.trim() ?? "";
        if (g && !seen.has(g)) {
          seen.add(g);
          grps.push(g);
        }
      }
      const baseline = Object.fromEntries(
        list.map((s) => [s.id, s.group?.trim() ?? ""]),
      );
      setGroups(grps.sort());
      setGroupOf(baseline);
      setSavedGroupOf(baseline);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [token]);

  // Compute how many schemas have changed relative to the last saved state
  const changedCount = Object.keys(groupOf).filter(
    (id) => (groupOf[id] ?? "") !== (savedGroupOf[id] ?? ""),
  ).length;

  // ── Drag handlers ──────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    const s = schemas.find((s) => s.id === event.active.id);
    setActiveSchema(s ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveSchema(null);
    const { active, over } = event;
    if (!over) return;
    const schemaId = active.id as string;
    const targetCol = over.id as string;
    const targetGroup = targetCol === UNGROUPED ? "" : targetCol;
    setGroupOf((prev) => ({ ...prev, [schemaId]: targetGroup }));
    setSaved(false);
  }

  // ── Group CRUD ─────────────────────────────────────────────────────────────

  function handleAddGroup() {
    const v = newGroupName.trim();
    if (!v) {
      setAddError("Name is required.");
      return;
    }
    if (groups.includes(v)) {
      setAddError("A group with that name already exists.");
      return;
    }
    setGroups((prev) => [...prev, v]);
    setNewGroupName("");
    setAddError("");
    setAddOpen(false);
  }

  function handleRenameGroup(oldName: string, newName: string) {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === oldName) return;
    if (groups.includes(trimmed)) return; // duplicate — silently ignore
    setGroups((prev) => prev.map((g) => (g === oldName ? trimmed : g)));
    setGroupOf((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (next[id] === oldName) next[id] = trimmed;
      }
      return next;
    });
    setSaved(false);
  }

  function handleDeleteGroup(name: string) {
    // Move all schemas in this group to ungrouped
    setGroupOf((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (next[id] === name) next[id] = "";
      }
      return next;
    });
    setGroups((prev) => prev.filter((g) => g !== name));
    setSaved(false);
  }

  // ── Save ───────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!token || changedCount === 0) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const changed = schemas.filter(
        (s) => (savedGroupOf[s.id] ?? "") !== (groupOf[s.id] ?? ""),
      );
      const files = changed.map((s) => {
        const newGroup = groupOf[s.id] ?? "";
        const updated: CmsSchema = { ...s };
        if (newGroup) {
          updated.group = newGroup;
        } else {
          delete updated.group;
        }
        return {
          path: `cms/schemas/${s.id}.schema.json`,
          content: JSON.stringify(updated, null, 2),
          message: `cms: update group assignments`,
        };
      });
      await commitFiles(token, REPO, BRANCH, files);
      // Refresh local schemas and update the saved baseline
      const refreshed = await listSchemas(token, REPO, BRANCH);
      const newBaseline = Object.fromEntries(
        refreshed.map((s) => [s.id, s.group?.trim() ?? ""]),
      );
      setSchemas(refreshed);
      setSavedGroupOf(newBaseline);
      setSaved(true);
      onSaved?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  // ── Schema lists per column ────────────────────────────────────────────────

  function schemasForGroup(g: string) {
    const q = search.trim().toLowerCase();
    return schemas.filter(
      (s) =>
        (groupOf[s.id] ?? "") === g &&
        (!q ||
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q)),
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (!token) {
    return (
      <Box sx={{ p: 6, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          Please log in to manage groups.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* ── Toolbar ── */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          borderBottom: "1px solid",
          borderColor: "grey.200",
          bgcolor: "#fff",
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Organize Groups
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Drag content types between columns to assign them to a group.
          </Typography>
        </Box>
        {saved && !saving && (
          <Chip
            icon={<CheckIcon />}
            label="Saved"
            color="success"
            size="small"
            variant="outlined"
          />
        )}
        {changedCount > 0 && !saving && (
          <Chip
            label={`${changedCount} unsaved change${changedCount !== 1 ? "s" : ""}`}
            color="warning"
            size="small"
            variant="outlined"
          />
        )}
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setNewGroupName("");
            setAddError("");
            setAddOpen(true);
          }}
          size="small"
          sx={{ borderRadius: 2 }}
        >
          New group
        </Button>
        <Tooltip
          title={
            !token
              ? "Log in first"
              : changedCount === 0
                ? "No changes to save"
                : `Commit ${changedCount} schema file${changedCount !== 1 ? "s" : ""} to ${BRANCH}`
          }
        >
          <span>
            <Button
              variant="contained"
              startIcon={
                saving ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <CloudUploadIcon />
                )
              }
              onClick={handleSave}
              disabled={saving || changedCount === 0}
              size="small"
              sx={{ borderRadius: 2, px: 2.5 }}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {error && (
        <Alert
          severity="error"
          onClose={() => setError("")}
          sx={{ borderRadius: 0, flexShrink: 0 }}
        >
          {error}
        </Alert>
      )}

      {/* ── Board ── */}
      <Box
        sx={{
          flex: 1,
          overflowX: "auto",
          overflowY: "auto",
          p: 3,
        }}
      >
        {!loading && schemas.length > 0 && (
          <TextField
            placeholder="Filter cards by name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{ mb: 2.5, width: 280 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon
                    fontSize="small"
                    sx={{ color: "text.disabled" }}
                  />
                </InputAdornment>
              ),
            }}
          />
        )}

        {loading && (
          <Box sx={{ display: "flex", gap: 2 }}>
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                variant="rounded"
                width={COL_WIDTH}
                height={320}
                sx={{ borderRadius: 3, flexShrink: 0 }}
              />
            ))}
          </Box>
        )}

        {!loading && (
          <DndContext
            sensors={sensors}
            collisionDetection={pointerWithin}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "flex-start",
                minWidth: "max-content",
                pb: 2,
              }}
            >
              {/* Named group columns */}
              {groups.map((g) => (
                <GroupColumn
                  key={g}
                  id={g}
                  label={g}
                  schemas={schemasForGroup(g)}
                  onRename={(newName) => handleRenameGroup(g, newName)}
                  onDelete={() => handleDeleteGroup(g)}
                />
              ))}

              {/* Ungrouped column — always last */}
              <GroupColumn
                id={UNGROUPED}
                label="Ungrouped"
                schemas={schemasForGroup("")}
                isUngrouped
              />
            </Box>

            {/* Drag overlay — ghost card that follows the cursor */}
            <DragOverlay dropAnimation={null}>
              {activeSchema && <SchemaCard schema={activeSchema} ghost />}
            </DragOverlay>
          </DndContext>
        )}

        {!loading && schemas.length === 0 && (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Typography color="text.secondary">
              No content models found. Create one in Content Models first.
            </Typography>
          </Box>
        )}
      </Box>

      {/* ── Add group dialog ── */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>New Group</DialogTitle>
        <DialogContent>
          <TextField
            label="Group name"
            value={newGroupName}
            onChange={(e) => {
              setNewGroupName(e.target.value);
              setAddError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddGroup();
            }}
            error={!!addError}
            helperText={addError || "e.g. Records, Navigation, Settings"}
            size="small"
            fullWidth
            autoFocus
            sx={{ mt: 0.5 }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddGroup}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
