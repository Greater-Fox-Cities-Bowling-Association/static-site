/**
 * ContentFileEditor — form editor for CMS entries.
 *
 * When a CmsSchema is provided the entry is rendered via DynamicForm.
 * For plain JSON files without a schema, a raw JSON text-area is shown.
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
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CodeIcon from "@mui/icons-material/Code";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { commitFiles } from "../../../../cms/github/github";
import type { CmsSchema, CmsEntry } from "../../../../cms/types";
import { validateEntry, validationErrorMap } from "../../../../cms/validation";
import { DynamicForm } from "./DynamicForm";

const REPO = import.meta.env.PUBLIC_GITHUB_REPO as string;
const BRANCH = import.meta.env.PUBLIC_GITHUB_BRANCH as string;

interface Props {
  filePath: string;
  initialContent: string;
  token: string | null;
  onBack: () => void;
  /** When provided, the entry is rendered via DynamicForm */
  schema?: CmsSchema;
}

/** Try to parse raw string into a CmsEntry (must be a non-null JSON object) */
function parseEntry(raw: string): CmsEntry | null {
  try {
    const obj = JSON.parse(raw);
    if (typeof obj === "object" && obj !== null && !Array.isArray(obj))
      return obj as CmsEntry;
    return null;
  } catch {
    return null;
  }
}

// ─── Schema-driven form editor ────────────────────────────────────────────────

function SchemaForm({
  filePath,
  initialContent,
  token,
  onBack,
  schema,
}: Props & { schema: CmsSchema }) {
  const [entry, setEntry] = useState<CmsEntry>(
    () => parseEntry(initialContent) ?? {},
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showRaw, setShowRaw] = useState(false);

  const displayName =
    (entry["title"] as string) ||
    (entry["name"] as string) ||
    filePath.split("/").pop() ||
    "Entry";
  const slugVal = (entry["slug"] as string) ?? "";

  async function handleSave() {
    if (!token) return;
    const errs = validateEntry(schema, entry);
    if (errs.length) {
      setFieldErrors(validationErrorMap(errs));
      setError("Please fix the errors below before saving.");
      return;
    }
    setFieldErrors({});
    setError("");
    setSaving(true);
    setSaved(false);
    try {
      await commitFiles(token, REPO, BRANCH, [
        {
          path: filePath,
          content: JSON.stringify(entry, null, 2),
          message: `content: update "${displayName}"`,
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
        <Tooltip title={`Back to ${schema.name}`}>
          <IconButton size="small" onClick={onBack}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {displayName}
          </Typography>
          {slugVal && (
            <Typography variant="caption" color="text.secondary">
              /{slugVal}
            </Typography>
          )}
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
          title={!token ? "You must be logged in to save" : `Save to ${BRANCH}`}
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
              {saving ? "Saving…" : "Save changes"}
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

      {/* ── Dynamic form ── */}
      <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2, sm: 4 } }}>
        <Box sx={{ maxWidth: 760, mx: "auto" }}>
          <DynamicForm
            fields={schema.fields}
            value={entry}
            onChange={(updated) => {
              setEntry(updated);
              setSaved(false);
              setFieldErrors({});
            }}
            errors={fieldErrors}
          />

          <Divider sx={{ my: 4 }} />

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
                Read-only view of what will be committed to GitHub.
              </Alert>
              <Box
                component="textarea"
                value={JSON.stringify(entry, null, 2)}
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
  const isStructuredJson =
    props.filePath.endsWith(".json") &&
    parseEntry(props.initialContent) !== null;

  if (isStructuredJson && props.schema) {
    return <SchemaForm {...props} schema={props.schema} />;
  }
  return <RawEditor {...props} />;
}
