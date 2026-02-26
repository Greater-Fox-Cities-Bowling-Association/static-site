/**
 * PageList.tsx
 * Lists all pages from src/content/pages/ on GitHub.
 * Allows opening a page in the editor, creating a new page, or deleting one.
 */
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Grid from "@mui/material/Grid";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  listDirectory,
  fetchFileContent,
} from "../../../../cms/github/githubContent";
import { commitFiles } from "../../../../cms/github/github";
import type { PageContent } from "../../../../cms/editor/layoutSchema";

interface Props {
  token: string | null;
  onEditPage: (page: PageContent) => void;
}

const REPO = import.meta.env.PUBLIC_GITHUB_REPO as string;
const BRANCH = import.meta.env.PUBLIC_GITHUB_BRANCH as string;
const PAGES_PATH = "src/content/pages";

export function PageList({ token, onEditPage }: Props) {
  const [pages, setPages] = useState<PageContent[]>([]);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState("");

  async function loadPages() {
    if (!token) return;
    setLoading(true);
    try {
      const files = await listDirectory(token, REPO, BRANCH, PAGES_PATH);
      const jsonFiles = files.filter((f) => f.name.endsWith(".json"));
      const loaded = await Promise.all(
        jsonFiles.map(async (f) => {
          const raw = await fetchFileContent(token, REPO, BRANCH, f.path);
          return JSON.parse(raw) as PageContent;
        }),
      );
      setPages(loaded.sort((a, b) => a.slug.localeCompare(b.slug)));
    } catch (err) {
      setSnack(`Failed to load pages: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPages();
  }, [token]);

  async function handleNewPage() {
    const slug = prompt('Enter a slug for the new page (e.g. "about"):');
    if (!slug || !token) return;
    const newPage: PageContent = {
      id: slug,
      slug,
      title: slug.charAt(0).toUpperCase() + slug.slice(1),
      description: "",
      layout: [],
    };
    try {
      await commitFiles(token, REPO, BRANCH, [
        {
          path: `${PAGES_PATH}/${slug}.json`,
          content: JSON.stringify(newPage, null, 2),
          message: `create: add page ${slug}`,
        },
      ]);
      onEditPage(newPage);
    } catch (err) {
      setSnack(`Failed to create page: ${(err as Error).message}`);
    }
  }

  async function handleDelete(page: PageContent) {
    if (!token || !confirm(`Delete page "${page.title}"?`)) return;
    try {
      // Fetch SHA needed for deletion
      const files = await listDirectory(token, REPO, BRANCH, PAGES_PATH);
      const file = files.find((f) => f.name === `${page.slug}.json`);
      if (!file) return;
      const res = await fetch(
        `https://api.github.com/repos/${REPO}/contents/${PAGES_PATH}/${page.slug}.json`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            message: `delete: remove page ${page.slug}`,
            sha: file.sha,
            branch: BRANCH,
          }),
        },
      );
      if (!res.ok) throw new Error(`GitHub API error ${res.status}`);
      setSnack("Page deleted.");
      loadPages();
    } catch (err) {
      setSnack(`Failed to delete: ${(err as Error).message}`);
    }
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Typography variant="h5">Pages</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewPage}
          disabled={!token}
        >
          New Page
        </Button>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && !token && (
        <Typography color="text.secondary">
          No GitHub token available. Please log in.
        </Typography>
      )}

      {!loading && token && pages.length === 0 && (
        <Typography color="text.secondary">
          No pages yet. Create your first page above.
        </Typography>
      )}

      <Grid container spacing={2}>
        {pages.map((page) => (
          <Grid item xs={12} sm={6} md={4} key={page.id}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6">{page.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  /{page.slug}
                </Typography>
                {page.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    {page.description}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  startIcon={<EditIcon />}
                  onClick={() => onEditPage(page)}
                >
                  Edit
                </Button>
                <Tooltip title="Delete page">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(page)}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack("")}
        message={snack}
      />
    </Box>
  );
}
