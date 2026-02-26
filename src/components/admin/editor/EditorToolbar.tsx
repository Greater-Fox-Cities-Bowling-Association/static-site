/**
 * EditorToolbar.tsx
 * Top bar for the visual editor: page title, undo/redo, Save draft, Publish.
 */
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import SaveIcon from "@mui/icons-material/Save";
import PublishIcon from "@mui/icons-material/CloudUpload";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useState } from "react";
import { useEditor } from "./EditorContext";
import { commitFiles } from "../../../../cms/github/github";

interface Props {
  token: string | null;
  onBack: () => void;
}

export function EditorToolbar({ token, onBack }: Props) {
  const { state, dispatch } = useEditor();
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState<{ open: boolean; message: string }>({
    open: false,
    message: "",
  });

  const repo = import.meta.env.PUBLIC_GITHUB_REPO as string;
  const branch = import.meta.env.PUBLIC_GITHUB_BRANCH as string;

  async function handleSave(publish: boolean) {
    if (!state.page || !token) {
      setSnack({
        open: true,
        message: "GitHub token not available. Check your Auth0 login.",
      });
      return;
    }
    setSaving(true);
    try {
      const path = `src/content/pages/${state.page.slug}.json`;
      const content = JSON.stringify(state.page, null, 2);
      const targetBranch = publish ? branch : branch; // Both go to configured branch
      await commitFiles(token, repo, targetBranch, [
        {
          path,
          content,
          message: `${publish ? "publish" : "save"}: update ${state.page.slug}`,
        },
      ]);
      dispatch({ type: "MARK_SAVED" });
      setSnack({
        open: true,
        message: publish ? "Published! Build triggered." : "Draft saved.",
      });
    } catch (err) {
      setSnack({ open: true, message: `Error: ${(err as Error).message}` });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <AppBar
        position="static"
        color="default"
        elevation={1}
        sx={{ zIndex: 1 }}
      >
        <Toolbar variant="dense">
          <Tooltip title="Back to pages">
            <IconButton edge="start" onClick={onBack} sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
          </Tooltip>

          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
            {state.page?.title ?? "Untitled Page"}
            {state.isDirty && (
              <Typography
                component="span"
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1 }}
              >
                (unsaved)
              </Typography>
            )}
          </Typography>

          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
            <Tooltip title="Undo (Ctrl+Z)">
              <span>
                <IconButton
                  size="small"
                  disabled={!state.history.length}
                  onClick={() => dispatch({ type: "UNDO" })}
                >
                  <UndoIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Redo (Ctrl+Y)">
              <span>
                <IconButton
                  size="small"
                  disabled={!state.future.length}
                  onClick={() => dispatch({ type: "REDO" })}
                >
                  <RedoIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Button
              size="small"
              variant="outlined"
              startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />}
              onClick={() => handleSave(false)}
              disabled={saving || !state.isDirty}
              sx={{ ml: 1 }}
            >
              Save
            </Button>

            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={
                saving ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <PublishIcon />
                )
              }
              onClick={() => handleSave(true)}
              disabled={saving}
              sx={{ ml: 1 }}
            >
              Publish
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        message={snack.message}
      />
    </>
  );
}
