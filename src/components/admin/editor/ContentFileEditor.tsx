/**
 * ContentFileEditor.tsx
 * Simple raw-text / JSON editor for any file in the GitHub repo.
 * Displays the file path, allows editing in a textarea, and commits on save.
 */
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import DataObjectIcon from "@mui/icons-material/DataObject";
import SaveIcon from "@mui/icons-material/Save";
import { commitFiles } from "../../../../cms/github/github";

const REPO = import.meta.env.PUBLIC_GITHUB_REPO as string;
const BRANCH = import.meta.env.PUBLIC_GITHUB_BRANCH as string;

interface Props {
  /** Repo-relative file path, e.g. "src/content/pages/home.json" */
  filePath: string;
  /** Raw file text as loaded from GitHub */
  initialContent: string;
  token: string | null;
  onBack: () => void;
}

export function ContentFileEditor({
  filePath,
  initialContent,
  token,
  onBack,
}: Props) {
  const [text, setText] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [snack, setSnack] = useState("");
  const [error, setError] = useState("");

  const isJson = filePath.endsWith(".json");

  function handleFormat() {
    try {
      setText(JSON.stringify(JSON.parse(text), null, 2));
    } catch {
      setError("Invalid JSON — cannot format.");
    }
  }

  async function handleSave() {
    if (!token) return;
    // Validate JSON before saving
    if (isJson) {
      try {
        JSON.parse(text);
      } catch {
        setError("Invalid JSON — please fix before saving.");
        return;
      }
    }
    setSaving(true);
    setError("");
    try {
      await commitFiles(token, REPO, BRANCH, [
        {
          path: filePath,
          content: text,
          message: `content: update ${filePath.split("/").pop()}`,
        },
      ]);
      setSnack("Saved and committed to GitHub ✓");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar variant="dense" sx={{ gap: 1 }}>
          <Tooltip title="Back to content list">
            <Button
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={onBack}
              sx={{ mr: 1 }}
            >
              Back
            </Button>
          </Tooltip>
          <Chip
            icon={<DataObjectIcon />}
            label={filePath}
            size="small"
            variant="outlined"
            sx={{
              fontFamily: "monospace",
              fontSize: 11,
              maxWidth: 480,
              overflow: "hidden",
            }}
          />
          <Box sx={{ flex: 1 }} />
          {isJson && (
            <Button
              size="small"
              variant="outlined"
              onClick={handleFormat}
              disabled={saving}
            >
              Format JSON
            </Button>
          )}
          <Tooltip title={!token ? "Log in first" : `Commit to ${BRANCH}`}>
            <span>
              <Button
                size="small"
                variant="contained"
                startIcon={
                  saving ? (
                    <CircularProgress size={13} color="inherit" />
                  ) : (
                    <SaveIcon />
                  )
                }
                onClick={handleSave}
                disabled={saving || !token}
              >
                Save
              </Button>
            </span>
          </Tooltip>
        </Toolbar>
      </Box>

      {/* Error banner */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError("")}
          sx={{ borderRadius: 0 }}
        >
          {error}
        </Alert>
      )}

      {/* Editor */}
      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          p: 2,
        }}
      >
        {!token && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            Log in to save changes.
          </Alert>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mb: 0.5, display: "block" }}
        >
          branch: <strong>{BRANCH}</strong>
        </Typography>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          style={{
            flex: 1,
            width: "100%",
            fontFamily: '"Roboto Mono", "Cousine", monospace',
            fontSize: 13,
            lineHeight: 1.6,
            padding: "12px",
            border: "1px solid rgba(0,0,0,0.23)",
            borderRadius: 4,
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
            background: "#fafafa",
          }}
        />
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
