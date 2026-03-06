/**
 * SchemaList.tsx
 * Lists all CMS schemas (content models) stored in cms/schemas/ on GitHub.
 * Allows creating new schemas and navigating to the schema editor.
 */
import { useEffect, useMemo, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import CategoryIcon from "@mui/icons-material/Category";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import ListAltIcon from "@mui/icons-material/ListAlt";
import { listSchemas } from "../../../../cms/github/githubSchemas";
import { commitFiles } from "../../../../cms/github/github";
import type { CmsSchema } from "../../../../cms/types";
import { SchemaEditor } from "./SchemaEditor";

const REPO = import.meta.env.PUBLIC_GITHUB_REPO as string;
const BRANCH = import.meta.env.PUBLIC_GITHUB_BRANCH as string;

interface Props {
  token: string | null;
  /**
   * Called after a schema is saved (with the saved schema's id) or deleted (no id).
   * The parent can use this to refresh its nav and navigate to the new schema.
   */
  onSaved?: (savedId?: string) => void;
}

export function SchemaList({ token, onSaved }: Props) {
  const [schemas, setSchemas] = useState<CmsSchema[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  // Editing state: null = list view, CmsSchema | 'new' = editor
  const [editing, setEditing] = useState<CmsSchema | "new" | null>(null);

  // Delete confirm dialog
  const [deleteTarget, setDeleteTarget] = useState<CmsSchema | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filter + group schemas
  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? schemas.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.id.toLowerCase().includes(q) ||
            (s.group ?? "").toLowerCase().includes(q),
        )
      : schemas;

    const order: string[] = [];
    const map = new Map<string, CmsSchema[]>();
    for (const s of filtered) {
      const g = s.group?.trim() || "";
      if (!map.has(g)) {
        order.push(g);
        map.set(g, []);
      }
      map.get(g)!.push(s);
    }
    // Named groups first (alpha), ungrouped last
    const named = order.filter((g) => g !== "").sort();
    return [
      ...named.map((g) => ({ group: g, schemas: map.get(g)! })),
      ...(map.has("") ? [{ group: null, schemas: map.get("")! }] : []),
    ];
  }, [schemas, search]);

  async function loadSchemas() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const list = await listSchemas(token, REPO, BRANCH);
      setSchemas(list);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSchemas();
  }, [token]);

  async function handleDeleteConfirm() {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      const GITHUB_API = "https://api.github.com";
      const path = `cms/schemas/${deleteTarget.id}.schema.json`;
      const res = await fetch(
        `${GITHUB_API}/repos/${REPO}/contents/${path}?ref=${BRANCH}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        },
      );
      const data = await res.json();
      await fetch(`${GITHUB_API}/repos/${REPO}/contents/${path}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `cms: delete schema "${deleteTarget.name}"`,
          sha: data.sha,
          branch: BRANCH,
        }),
      });
      setDeleteTarget(null);
      await loadSchemas();
      onSaved?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  // ── Editor view ──────────────────────────────────────────────────────────
  if (editing !== null) {
    return (
      <SchemaEditor
        initialSchema={editing === "new" ? null : editing}
        token={token}
        allSchemas={schemas}
        onBack={() => setEditing(null)}
        onSaved={(saved) => {
          setEditing(null);
          loadSchemas();
          onSaved?.(saved.id);
        }}
      />
    );
  }

  // ── List view ────────────────────────────────────────────────────────────
  if (!token) {
    return (
      <Box sx={{ p: 6, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          Please log in to manage content models.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 4 },
        maxWidth: 1100,
        mx: "auto",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 3,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Content Models
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {loading
              ? "Loading…"
              : `${schemas.length} model${schemas.length !== 1 ? "s" : ""} · branch: ${BRANCH}`}
          </Typography>
        </Box>
        <Tooltip title="Reload models from GitHub">
          <IconButton onClick={loadSchemas} disabled={loading} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setEditing("new")}
          size="large"
          sx={{ borderRadius: 2, px: 3 }}
        >
          New model
        </Button>
      </Box>

      {/* Search */}
      {!loading && schemas.length > 0 && (
        <TextField
          placeholder="Search by name, ID, or group…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          fullWidth
          sx={{ mb: 3 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "text.disabled" }} />
              </InputAdornment>
            ),
          }}
        />
      )}

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Grid container spacing={2}>
          {[0, 1, 2].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton
                variant="rounded"
                height={160}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty */}
      {!loading && schemas.length === 0 && !error && (
        <Box
          sx={{
            textAlign: "center",
            py: 10,
            px: 4,
            border: "2px dashed",
            borderColor: "grey.200",
            borderRadius: 4,
          }}
        >
          <CategoryIcon sx={{ fontSize: 56, color: "grey.300", mb: 2 }} />
          <Typography variant="h6" fontWeight={600} gutterBottom>
            No content models yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Define a content model to control what fields editors see when
            creating content.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setEditing("new")}
          >
            Create your first model
          </Button>
        </Box>
      )}

      {/* Grouped cards */}
      {!loading && schemas.length > 0 && (
        <Box>
          {grouped.length === 0 && (
            <Box
              sx={{
                textAlign: "center",
                py: 6,
                border: "2px dashed",
                borderColor: "grey.200",
                borderRadius: 4,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                No models match "{search}"
              </Typography>
            </Box>
          )}
          {grouped.map(({ group, schemas: groupSchemas }, idx) => (
            <Box key={group ?? "__ungrouped"} sx={{ mb: 4 }}>
              {/* Group divider (not before first group) */}
              {idx > 0 && <Divider sx={{ mb: 3 }} />}
              {/* Group header */}
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}
              >
                <FolderOpenIcon
                  sx={{
                    fontSize: 16,
                    color: group ? "primary.main" : "text.disabled",
                  }}
                />
                <Typography
                  variant="overline"
                  sx={{
                    fontWeight: 700,
                    letterSpacing: 1,
                    color: group ? "primary.main" : "text.disabled",
                    lineHeight: 1,
                  }}
                >
                  {group ?? "Ungrouped"}
                </Typography>
                <Chip
                  label={groupSchemas.length}
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 11,
                    "& .MuiChip-label": { px: 0.8 },
                  }}
                />
              </Box>
              <Grid container spacing={2}>
                {groupSchemas.map((schema) => (
                  <Grid item xs={12} sm={6} md={4} key={schema.id}>
                    <Card
                      elevation={0}
                      sx={{
                        border: "1px solid",
                        borderColor: "grey.200",
                        borderRadius: 3,
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        transition: "box-shadow 0.15s, border-color 0.15s",
                        "&:hover": {
                          boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                          borderColor: "primary.light",
                        },
                      }}
                    >
                      <CardContent sx={{ flex: 1, pb: 0 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: 1.5,
                            mb: 1,
                          }}
                        >
                          <Box
                            sx={{
                              width: 40,
                              height: 40,
                              borderRadius: 2,
                              bgcolor: schema.listOnly ? "#eff6ff" : "#f0fdf4",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {schema.listOnly ? (
                              <ListAltIcon
                                sx={{ color: "primary.main", fontSize: 22 }}
                              />
                            ) : (
                              <CategoryIcon
                                sx={{ color: "success.main", fontSize: 22 }}
                              />
                            )}
                          </Box>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                                flexWrap: "wrap",
                              }}
                            >
                              <Typography variant="subtitle1" fontWeight={700}>
                                {schema.name}
                              </Typography>
                              {schema.listOnly && (
                                <Chip
                                  label="list item"
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{
                                    height: 18,
                                    fontSize: 10,
                                    "& .MuiChip-label": { px: 0.75 },
                                  }}
                                />
                              )}
                            </Box>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {schema.directory}
                            </Typography>
                          </Box>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 0.5,
                            mt: 1,
                          }}
                        >
                          {schema.fields.slice(0, 4).map((f) => (
                            <Chip
                              key={f.name}
                              label={f.label}
                              size="small"
                              variant="outlined"
                              sx={{ fontFamily: "monospace", fontSize: 11 }}
                            />
                          ))}
                          {schema.fields.length > 4 && (
                            <Chip
                              label={`+${schema.fields.length - 4} more`}
                              size="small"
                              sx={{ fontSize: 11 }}
                            />
                          )}
                        </Box>
                      </CardContent>
                      <CardActions sx={{ px: 2, pb: 1.5, pt: 1, gap: 0.5 }}>
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<EditOutlinedIcon />}
                          onClick={() => setEditing(schema)}
                          sx={{ flex: 1 }}
                        >
                          Edit model
                        </Button>
                        <Tooltip title="Delete model">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => setDeleteTarget(schema)}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          ))}
        </Box>
      )}

      {/* Delete confirm */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Delete "{deleteTarget?.name}"?
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This removes the schema file from GitHub. Existing content entries
            in <strong>{deleteTarget?.directory}</strong> are NOT deleted.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteTarget(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirm}
            disabled={deleting}
            startIcon={
              deleting ? (
                <CircularProgress size={14} color="inherit" />
              ) : (
                <DeleteOutlineIcon />
              )
            }
          >
            {deleting ? "Deleting…" : "Yes, delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
