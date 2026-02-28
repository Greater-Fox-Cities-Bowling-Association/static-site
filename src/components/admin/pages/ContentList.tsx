/**
 * ContentList.tsx
 * Browses src/content/ from GitHub and lets editors open any file for editing,
 * create new JSON files, or delete existing ones.
 */
import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Snackbar from "@mui/material/Snackbar";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import DescriptionIcon from "@mui/icons-material/Description";
import EditIcon from "@mui/icons-material/Edit";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import FolderIcon from "@mui/icons-material/Folder";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  listDirectory,
  fetchFileContent,
  type GitHubFile,
} from "../../../../cms/github/githubContent";
import { commitFiles } from "../../../../cms/github/github";

const REPO = import.meta.env.PUBLIC_GITHUB_REPO as string;
const BRANCH = import.meta.env.PUBLIC_GITHUB_BRANCH as string;
const ROOT_PATH = "src/content";

interface Props {
  token: string | null;
  onEditFile: (path: string, content: string) => void;
}

/** Folder node that can be expanded to reveal children */
function FolderNode({
  dirPath,
  label,
  token,
  onEditFile,
  onDelete,
  depth,
}: {
  dirPath: string;
  label: string;
  token: string | null;
  onEditFile: (path: string, content: string) => void;
  onDelete: (file: GitHubFile) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(depth === 0);
  const [items, setItems] = useState<GitHubFile[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    if (!token) return;
    setLoading(true);
    try {
      const list = await listDirectory(token, REPO, BRANCH, dirPath);
      setItems(
        list.sort((a, b) =>
          a.type === b.type
            ? a.name.localeCompare(b.name)
            : a.type === "dir"
              ? -1
              : 1,
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) load();
  }, [open, token]);

  async function handleFileClick(file: GitHubFile) {
    if (!token) return;
    const raw = await fetchFileContent(token, REPO, BRANCH, file.path);
    onEditFile(file.path, raw);
  }

  return (
    <>
      <ListItemButton
        onClick={() => setOpen((v) => !v)}
        sx={{ pl: 2 + depth * 2 }}
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          <FolderIcon fontSize="small" color="warning" />
        </ListItemIcon>
        <ListItemText
          primary={label}
          primaryTypographyProps={{ variant: "body2", fontWeight: 600 }}
        />
        {loading ? (
          <CircularProgress size={14} />
        ) : open ? (
          <ExpandLess fontSize="small" />
        ) : (
          <ExpandMore fontSize="small" />
        )}
      </ListItemButton>
      <Collapse in={open}>
        <List disablePadding>
          {items.map((item) =>
            item.type === "dir" ? (
              <FolderNode
                key={item.path}
                dirPath={item.path}
                label={item.name}
                token={token}
                onEditFile={onEditFile}
                onDelete={onDelete}
                depth={depth + 1}
              />
            ) : (
              <ListItemButton
                key={item.path}
                sx={{ pl: 2 + (depth + 1) * 2, pr: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <DescriptionIcon fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText
                  primary={item.name}
                  primaryTypographyProps={{ variant: "body2" }}
                  sx={{ flex: 1 }}
                />
                <Tooltip title="Edit">
                  <IconButton
                    size="small"
                    onClick={() => handleFileClick(item)}
                  >
                    <EditIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton
                    size="small"
                    onClick={() => onDelete(item)}
                    color="error"
                  >
                    <DeleteIcon fontSize="inherit" />
                  </IconButton>
                </Tooltip>
              </ListItemButton>
            ),
          )}
          {!loading && items.length === 0 && (
            <Box sx={{ pl: 4 + depth * 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                (empty)
              </Typography>
            </Box>
          )}
        </List>
      </Collapse>
    </>
  );
}

export function ContentList({ token, onEditFile }: Props) {
  const [snack, setSnack] = useState("");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  async function handleNewFile() {
    const rawPath = prompt(
      "Enter a path relative to src/content/\ne.g. pages/about.json or data/settings.json",
    );
    if (!rawPath || !token) return;
    const path = `${ROOT_PATH}/${rawPath.replace(/^\//, "")}`;
    const initial = rawPath.endsWith(".json")
      ? JSON.stringify(
          {
            slug: rawPath.split("/").pop()?.replace(".json", ""),
            title: "",
            description: "",
          },
          null,
          2,
        )
      : "";
    try {
      await commitFiles(token, REPO, BRANCH, [
        { path, content: initial, message: `content: create ${path}` },
      ]);
      setSnack(`Created ${path}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(file: GitHubFile) {
    if (!token) return;
    if (!confirm(`Delete ${file.path}?`)) return;
    // GitHub delete requires the blob SHA and an empty tree entry.
    // We use the commitFiles helper to null out the tree entry by not including it
    // and instead use the low-level API directly.
    try {
      const GITHUB_API = "https://api.github.com";
      // Fetch current file to get its sha
      const res = await fetch(
        `${GITHUB_API}/repos/${REPO}/contents/${file.path}?ref=${BRANCH}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
          },
        },
      );
      const data = await res.json();
      await fetch(`${GITHUB_API}/repos/${REPO}/contents/${file.path}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `content: delete ${file.path}`,
          sha: data.sha,
          branch: BRANCH,
        }),
      });
      setSnack(`Deleted ${file.path}`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!token) {
    return (
      <Box sx={{ p: 4 }}>
        <Alert severity="warning">Log in to browse content files.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar variant="dense">
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
            Content
          </Typography>
          <Tooltip title="Refresh">
            <IconButton
              size="small"
              onClick={() => setRefreshKey((k) => k + 1)}
              sx={{ mr: 1 }}
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            size="small"
            startIcon={<AddIcon />}
            variant="outlined"
            onClick={handleNewFile}
          >
            New File
          </Button>
        </Toolbar>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <List dense disablePadding key={refreshKey}>
          <FolderNode
            dirPath={ROOT_PATH}
            label="src/content"
            token={token}
            onEditFile={onEditFile}
            onDelete={handleDelete}
            depth={0}
          />
        </List>
        <Divider />
        <Box sx={{ p: 2 }}>
          <Typography variant="caption" color="text.secondary">
            Files are stored in the GitHub repo · branch:{" "}
            <strong>{BRANCH}</strong>
          </Typography>
        </Box>
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack("")}
        message={snack}
      />
    </Box>
  );
}
