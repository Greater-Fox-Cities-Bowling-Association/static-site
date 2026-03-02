/**
 * ContentList — page card grid for the CMS.
 * Shows all JSON pages in src/content/pages/ as friendly cards.
 * Create/delete actions use MUI dialogs (no browser prompt/confirm).
 */
import { useEffect, useRef, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Skeleton from "@mui/material/Skeleton";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ArticleOutlinedIcon from "@mui/icons-material/ArticleOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  listDirectory,
  fetchFileContent,
  type GitHubFile,
} from "../../../../cms/github/githubContent";
import { commitFiles } from "../../../../cms/github/github";
import type { ContentPage } from "../../../../cms/types";

const REPO = import.meta.env.PUBLIC_GITHUB_REPO as string;
const BRANCH = import.meta.env.PUBLIC_GITHUB_BRANCH as string;
const PAGES_PATH = "src/content/pages";

interface Props {
  token: string | null;
  onEditFile: (path: string, content: string) => void;
}

// ─── New Page Dialog ─────────────────────────────────────────────────────────

function NewPageDialog({
  open,
  onClose,
  onConfirm,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (title: string, slug: string) => void;
  saving: boolean;
}) {
  const [title, setTitle] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [slug, setSlug] = useState("");

  function toSlug(s: string) {
    return s
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  }

  function handleTitleChange(v: string) {
    setTitle(v);
    if (!slugEdited) setSlug(toSlug(v));
  }

  function handleSlugChange(v: string) {
    setSlugEdited(true);
    setSlug(toSlug(v));
  }

  function handleClose() {
    setTitle("");
    setSlug("");
    setSlugEdited(false);
    onClose();
  }

  function handleSubmit() {
    if (!title.trim() || !slug.trim()) return;
    onConfirm(title.trim(), slug.trim());
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>Create a new page</DialogTitle>
      <DialogContent
        sx={{
          pt: "12px !important",
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <TextField
          label="Page title"
          placeholder="e.g. About Us"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          autoFocus
          fullWidth
          size="small"
          helperText="This appears in the browser tab and as the page heading."
        />
        <TextField
          label="URL slug"
          placeholder="e.g. about-us"
          value={slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          fullWidth
          size="small"
          helperText={`Your page will be at /${slug || "…"}`}
          InputProps={{
            startAdornment: (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mr: 0.5, whiteSpace: "nowrap" }}
              >
                /
              </Typography>
            ),
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!title.trim() || !slug.trim() || saving}
          startIcon={
            saving ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <AddIcon />
            )
          }
        >
          {saving ? "Creating…" : "Create page"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Delete Confirm Dialog ────────────────────────────────────────────────────

function DeleteDialog({
  page,
  onClose,
  onConfirm,
  deleting,
}: {
  page: ContentPage | null;
  onClose: () => void;
  onConfirm: () => void;
  deleting: boolean;
}) {
  return (
    <Dialog open={!!page} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Delete "{page?.title}"?
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary">
          This will permanently remove the page <strong>{page?.slug}</strong>{" "}
          from your site. This cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={deleting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
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
  );
}

// ─── Page card ────────────────────────────────────────────────────────────────

function PageCard({
  page,
  onEdit,
  onDelete,
}: {
  page: ContentPage & { _path: string };
  onEdit: () => void;
  onDelete: () => void;
}) {
  const liveUrl = `/${page.slug === "home" ? "" : page.slug}`;

  return (
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
        {/* Icon + title row */}
        <Box
          sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 1 }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              bgcolor: "#eff6ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ArticleOutlinedIcon sx={{ color: "primary.main", fontSize: 22 }} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="subtitle1"
              fontWeight={700}
            >
              {page.title || <em style={{ opacity: 0.5 }}>Untitled</em>}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              /{page.slug}
            </Typography>
          </Box>
        </Box>
        {/* Description */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 2,
            overflow: "hidden",
            minHeight: 40,
            mt: 0.5,
          }}
        >
          {page.description || <em>No description yet.</em>}
        </Typography>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 1.5, pt: 1, gap: 0.5 }}>
        <Button
          variant="contained"
          size="small"
          startIcon={<EditOutlinedIcon />}
          onClick={onEdit}
          sx={{ flex: 1 }}
        >
          Edit
        </Button>
        <Tooltip title={`View live page: ${liveUrl}`}>
          <IconButton
            size="small"
            component="a"
            href={liveUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete page">
          <IconButton size="small" color="error" onClick={onDelete}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </CardActions>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ContentList({ token, onEditFile }: Props) {
  const [pages, setPages] = useState<(ContentPage & { _path: string })[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [snack, setSnack] = useState("");

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<
    (ContentPage & { _path: string }) | null
  >(null);
  const [deleting, setDeleting] = useState(false);

  async function loadPages() {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const files = await listDirectory(token, REPO, BRANCH, PAGES_PATH);
      const jsonFiles = files.filter(
        (f): f is GitHubFile => f.type === "file" && f.name.endsWith(".json"),
      );
      const loaded = await Promise.all(
        jsonFiles.map(async (f) => {
          const raw = await fetchFileContent(token, REPO, BRANCH, f.path);
          const parsed = JSON.parse(raw) as ContentPage;
          return { ...parsed, _path: f.path };
        }),
      );
      setPages(loaded.sort((a, b) => a.slug.localeCompare(b.slug)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPages();
  }, [token]);

  async function handleCreate(title: string, slug: string) {
    if (!token) return;
    setCreating(true);
    const newPage: ContentPage = {
      slug,
      title,
      description: "",
      body: "",
    };
    try {
      await commitFiles(token, REPO, BRANCH, [
        {
          path: `${PAGES_PATH}/${slug}.json`,
          content: JSON.stringify(newPage, null, 2),
          message: `content: create page "${slug}"`,
        },
      ]);
      setCreateOpen(false);
      setSnack(`Page "${title}" created!`);
      await loadPages();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!token || !deleteTarget) return;
    setDeleting(true);
    try {
      const GITHUB_API = "https://api.github.com";
      const res = await fetch(
        `${GITHUB_API}/repos/${REPO}/contents/${deleteTarget._path}?ref=${BRANCH}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        },
      );
      const data = await res.json();
      await fetch(
        `${GITHUB_API}/repos/${REPO}/contents/${deleteTarget._path}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `content: delete page "${deleteTarget.slug}"`,
            sha: data.sha,
            branch: BRANCH,
          }),
        },
      );
      setSnack(`"${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
      await loadPages();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  async function handleEdit(page: ContentPage & { _path: string }) {
    if (!token) return;
    const raw = await fetchFileContent(token, REPO, BRANCH, page._path);
    onEditFile(page._path, raw);
  }

  if (!token) {
    return (
      <Box sx={{ p: 6, textAlign: "center" }}>
        <Typography variant="h6" color="text.secondary">
          Please log in to manage your pages.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 1100, mx: "auto", width: "100%", boxSizing: "border-box" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 4,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={700}>
            Your Pages
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            {loading
              ? "Loading…"
              : `${pages.length} page${pages.length !== 1 ? "s" : ""} · branch: ${BRANCH}`}
          </Typography>
        </Box>
        <Tooltip title="Reload pages from GitHub">
          <IconButton onClick={loadPages} disabled={loading} size="small">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateOpen(true)}
          size="large"
          sx={{ borderRadius: 2, px: 3 }}
        >
          New page
        </Button>
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading skeletons */}
      {loading && (
        <Grid container spacing={2}>
          {[0, 1, 2].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton
                variant="rounded"
                height={180}
                sx={{ borderRadius: 3 }}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty state */}
      {!loading && pages.length === 0 && !error && (
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
          <ArticleOutlinedIcon
            sx={{ fontSize: 56, color: "grey.300", mb: 2 }}
          />
          <Typography variant="h6" fontWeight={600} gutterBottom>
            No pages yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first page to get started.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateOpen(true)}
          >
            Create your first page
          </Button>
        </Box>
      )}

      {/* Page cards */}
      {!loading && pages.length > 0 && (
        <Grid container spacing={2}>
          {pages.map((page) => (
            <Grid item xs={12} sm={6} md={4} key={page.slug}>
              <PageCard
                page={page}
                onEdit={() => handleEdit(page)}
                onDelete={() => setDeleteTarget(page)}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialogs */}
      <NewPageDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onConfirm={handleCreate}
        saving={creating}
      />
      <DeleteDialog
        page={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        deleting={deleting}
      />

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack("")}
        message={snack}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      />
    </Box>
  );
}
