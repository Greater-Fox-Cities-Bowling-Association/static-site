/**
 * ContentFileEditor — friendly form editor for CMS content pages.
 *
 * For .json files that match the ContentPage schema, show labelled fields.
 * An "Advanced" section at the bottom gives raw JSON access for power users.
 * Other file types get a plain text area.
 */
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CodeIcon from "@mui/icons-material/Code";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { commitFiles } from "../../../../cms/github/github";
import type { ContentPage } from "../../../../cms/types";

const REPO = import.meta.env.PUBLIC_GITHUB_REPO as string;
const BRANCH = import.meta.env.PUBLIC_GITHUB_BRANCH as string;

interface Props {
  filePath: string;
  initialContent: string;
  token: string | null;
  onBack: () => void;
}

/** Try to parse JSON and detect if it's a ContentPage (has slug + title) */
function parseContentPage(raw: string): ContentPage | null {
  try {
    const obj = JSON.parse(raw);
    if (typeof obj === "object" && obj !== null && "slug" in obj)
      return obj as ContentPage;
    return null;
  } catch {
    return null;
  }
}

// ─── Form editor for ContentPage JSON ────────────────────────────────────────

function PageForm({ filePath, initialContent, token, onBack }: Props) {
  const initial = parseContentPage(initialContent)!;

  const [title, setTitle] = useState(initial.title ?? "");
  const [slug, setSlug] = useState(initial.slug ?? "");
  const [description, setDescription] = useState(
    (initial.description as string) ?? "",
  );
  const [body, setBody] = useState((initial.body as string) ?? "");

  // Extra fields not handled by the form
  const knownKeys = new Set(["slug", "title", "description", "body"]);
  const extraFields = Object.fromEntries(
    Object.entries(initial).filter(([k]) => !knownKeys.has(k)),
  );

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  // Raw JSON derived from form state
  function buildJson() {
    return JSON.stringify(
      { slug, title, description, body, ...extraFields },
      null,
      2,
    );
  }

  const fileName = filePath.split("/").pop() ?? filePath;

  async function handleSave() {
    if (!token) return;
    if (!slug.trim()) {
      setError("URL slug is required.");
      return;
    }
    if (!title.trim()) {
      setError("Page title is required.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await commitFiles(token, REPO, BRANCH, [
        {
          path: filePath,
          content: buildJson(),
          message: `content: update "${title}"`,
        },
      ]);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Top bar ── */}
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
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Tooltip title="Back to all pages">
          <IconButton size="small" onClick={onBack}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {title || fileName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Editing /{slug}
          </Typography>
        </Box>
        <Chip
          label={`Branch: ${BRANCH}`}
          size="small"
          variant="outlined"
          sx={{ display: { xs: "none", sm: "flex" } }}
        />
        {saved && !saving && (
          <Chip
            icon={<CheckCircleOutlineIcon />}
            label="Saved"
            color="success"
            size="small"
            variant="outlined"
          />
        )}
        <Tooltip
          title={
            !token ? "You must be logged in to save" : `Publish to ${BRANCH}`
          }
        >
          <span>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || !token}
              startIcon={
                saving ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <CloudUploadIcon />
                )
              }
              sx={{ borderRadius: 2, px: 3 }}
            >
              {saving ? "Saving…" : "Publish changes"}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {/* ── Error banner ── */}
      {error && (
        <Alert
          severity="error"
          onClose={() => setError("")}
          sx={{ borderRadius: 0 }}
        >
          {error}
        </Alert>
      )}

      {/* ── Form ── */}
      <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2, sm: 4 } }}>
        <Box
          sx={{
            maxWidth: 760,
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          {/* Title */}
          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 700, letterSpacing: 1 }}
            >
              Page Title
            </Typography>
            <TextField
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setSaved(false);
              }}
              placeholder="e.g. About Our Club"
              fullWidth
              variant="outlined"
              size="medium"
              helperText="This shows in the browser tab and at the top of the page."
              sx={{ mt: 0.5 }}
            />
          </Box>

          {/* Slug */}
          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 700, letterSpacing: 1 }}
            >
              Page URL
            </Typography>
            <TextField
              value={slug}
              onChange={(e) => {
                setSlug(
                  e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                );
                setSaved(false);
              }}
              fullWidth
              size="medium"
              variant="outlined"
              helperText={`Your page lives at: /${slug}`}
              InputProps={{
                startAdornment: (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mr: 0.5, userSelect: "none" }}
                  >
                    /
                  </Typography>
                ),
              }}
              sx={{ mt: 0.5 }}
            />
          </Box>

          {/* Description */}
          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 700, letterSpacing: 1 }}
            >
              Short Description
            </Typography>
            <TextField
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setSaved(false);
              }}
              placeholder="A brief sentence about this page (used for search engines)."
              fullWidth
              multiline
              rows={2}
              size="medium"
              variant="outlined"
              helperText="Appears in Google search results. Keep it under 160 characters."
              sx={{ mt: 0.5 }}
            />
          </Box>

          {/* Body */}
          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ fontWeight: 700, letterSpacing: 1 }}
            >
              Page Content
            </Typography>
            <TextField
              value={body}
              onChange={(e) => {
                setBody(e.target.value);
                setSaved(false);
              }}
              placeholder="Write the page content here. You can use basic HTML like <b>bold</b>, <a href='...'>links</a>, <p>paragraphs</p>."
              fullWidth
              multiline
              rows={12}
              size="medium"
              variant="outlined"
              helperText="Supports HTML. Use <p> for paragraphs, <b> for bold, <a href='…'> for links."
              sx={{
                mt: 0.5,
                "& .MuiInputBase-input": {
                  fontFamily: "inherit",
                  fontSize: 15,
                  lineHeight: 1.7,
                },
              }}
            />
          </Box>

          <Divider />

          {/* Advanced — raw JSON */}
          <Box>
            <Button
              size="small"
              startIcon={<CodeIcon fontSize="small" />}
              endIcon={
                <ExpandMoreIcon
                  fontSize="small"
                  sx={{
                    transform: showRaw ? "rotate(180deg)" : "none",
                    transition: "0.2s",
                  }}
                />
              }
              onClick={() => setShowRaw((v) => !v)}
              color="inherit"
              sx={{ color: "text.secondary", mb: 1 }}
            >
              Advanced: raw JSON
            </Button>
            <Collapse in={showRaw}>
              <Alert severity="info" sx={{ mb: 1.5 }}>
                Advanced users only. Editing here will override the fields above
                on next save.
              </Alert>
              <Box
                component="textarea"
                value={buildJson()}
                readOnly
                sx={{
                  width: "100%",
                  minHeight: 200,
                  fontFamily: '"Roboto Mono", monospace',
                  fontSize: 12,
                  lineHeight: 1.6,
                  p: 1.5,
                  border: "1px solid",
                  borderColor: "grey.300",
                  borderRadius: 1,
                  bgcolor: "#f8fafc",
                  resize: "vertical",
                  outline: "none",
                  boxSizing: "border-box",
                  color: "text.secondary",
                }}
              />
            </Collapse>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ─── Plain text/raw editor (for non-ContentPage files) ───────────────────────

function RawEditor({ filePath, initialContent, token, onBack }: Props) {
  const [text, setText] = useState(initialContent);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const isJson = filePath.endsWith(".json");

  async function handleSave() {
    if (!token) return;
    if (isJson) {
      try {
        JSON.parse(text);
      } catch {
        setError("Invalid JSON — please fix the syntax before saving.");
        return;
      }
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await commitFiles(token, REPO, BRANCH, [
        {
          path: filePath,
          content: text,
          message: `content: update ${filePath.split("/").pop()}`,
        },
      ]);
      setSaved(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
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
        }}
      >
        <Tooltip title="Back">
          <IconButton size="small" onClick={onBack}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Typography variant="subtitle1" fontWeight={700} sx={{ flex: 1 }}>
          {filePath.split("/").pop()}
        </Typography>
        {saved && (
          <Chip
            icon={<CheckCircleOutlineIcon />}
            label="Saved"
            color="success"
            size="small"
            variant="outlined"
          />
        )}
        <Tooltip title={!token ? "Log in first" : `Publish to ${BRANCH}`}>
          <span>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || !token}
              startIcon={
                saving ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <CloudUploadIcon />
                )
              }
              sx={{ borderRadius: 2 }}
            >
              {saving ? "Saving…" : "Publish changes"}
            </Button>
          </span>
        </Tooltip>
      </Box>
      {error && (
        <Alert
          severity="error"
          onClose={() => setError("")}
          sx={{ borderRadius: 0 }}
        >
          {error}
        </Alert>
      )}
      <Box sx={{ flex: 1, p: 2, display: "flex", flexDirection: "column" }}>
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSaved(false);
          }}
          spellCheck={false}
          style={{
            flex: 1,
            width: "100%",
            fontFamily: '"Roboto Mono", monospace',
            fontSize: 13,
            lineHeight: 1.6,
            padding: 12,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            resize: "none",
            outline: "none",
            boxSizing: "border-box",
            background: "#f8fafc",
          }}
        />
      </Box>
    </Box>
  );
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export function ContentFileEditor(props: Props) {
  const isPageJson =
    props.filePath.endsWith(".json") &&
    parseContentPage(props.initialContent) !== null;

  if (isPageJson) return <PageForm {...props} />;
  return <RawEditor {...props} />;
}
