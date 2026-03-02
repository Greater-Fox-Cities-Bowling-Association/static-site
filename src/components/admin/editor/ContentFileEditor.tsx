/**
 * ContentFileEditor — form editor for CMS entries.
 *
 * When a CmsSchema is provided the entry is rendered via DynamicForm.
 * For plain JSON files without a schema, a raw JSON text-area is shown.
 * When the content file uses versioning (_versions array), the editor shows
 * a version history panel and saves produce new immutable version snapshots.
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
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import CodeIcon from "@mui/icons-material/Code";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import HistoryIcon from "@mui/icons-material/History";
import RestoreIcon from "@mui/icons-material/Restore";
import { commitFiles } from "../../../../cms/github/github";
import type {
  CmsSchema,
  CmsEntry,
  ContentVersion,
  VersionedCmsEntry,
} from "../../../../cms/types";
import { isVersioned, resolvePublished } from "../../../../cms/types";
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
  // Parse raw content once at mount.
  const parsed = parseEntry(initialContent) ?? {};
  const entryIsVersioned = isVersioned(parsed as unknown);

  // Full versioned document (null for plain entries)
  const [versionedDoc, setVersionedDoc] = useState<VersionedCmsEntry | null>(
    () => (entryIsVersioned ? (parsed as unknown as VersionedCmsEntry) : null),
  );

  // The editable field data shown in the form.
  // For versioned entries this is the published version's data only (no metadata).
  const [entry, setEntry] = useState<CmsEntry>(() => {
    if (entryIsVersioned) {
      const doc = parsed as unknown as VersionedCmsEntry;
      const pub = doc._versions.find(
        (v) => v.version === doc._publishedVersion,
      );
      return pub?.data ?? {};
    }
    return parsed;
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showRaw, setShowRaw] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");

  const displayName =
    versionedDoc?.slug ||
    (entry["title"] as string) ||
    (entry["name"] as string) ||
    filePath.split("/").pop() ||
    "Entry";

  const slugVal = versionedDoc?.slug ?? (entry["slug"] as string) ?? "";

  // ── Save (versioned: creates snapshot; plain: overwrites) ─────────────────
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
      let content: string;
      if (versionedDoc) {
        // Create a new immutable version snapshot and auto-publish it.
        const newVersion: ContentVersion = {
          version:
            Math.max(...versionedDoc._versions.map((v) => v.version)) + 1,
          createdAt: new Date().toISOString(),
          ...(versionLabel.trim() ? { label: versionLabel.trim() } : {}),
          data: { ...entry },
        };
        const newDoc: VersionedCmsEntry = {
          ...versionedDoc,
          _publishedVersion: newVersion.version,
          _versions: [...versionedDoc._versions, newVersion],
        };
        setVersionedDoc(newDoc);
        setVersionLabel("");
        content = JSON.stringify(newDoc, null, 2);
      } else {
        content = JSON.stringify(entry, null, 2);
      }
      await commitFiles(token, REPO, BRANCH, [
        {
          path: filePath,
          content,
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

  // ── Restore an older version as the published one ──────────────────────────
  async function handleRestore(targetVersion: number) {
    if (!token || !versionedDoc) return;
    const v = versionedDoc._versions.find((v) => v.version === targetVersion);
    if (!v) return;
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const newDoc: VersionedCmsEntry = {
        ...versionedDoc,
        _publishedVersion: targetVersion,
      };
      setVersionedDoc(newDoc);
      setEntry(v.data);
      await commitFiles(token, REPO, BRANCH, [
        {
          path: filePath,
          content: JSON.stringify(newDoc, null, 2),
          message: `content: restore "${displayName}" to v${targetVersion}`,
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
              {saving
                ? "Saving…"
                : versionedDoc
                  ? "Publish new version"
                  : "Save changes"}
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
                value={
                  versionedDoc
                    ? JSON.stringify(
                        {
                          ...versionedDoc,
                          _versions: [
                            ...versionedDoc._versions,
                            {
                              version:
                                Math.max(
                                  ...versionedDoc._versions.map(
                                    (v) => v.version,
                                  ),
                                ) + 1,
                              createdAt: "<now>",
                              ...(versionLabel.trim()
                                ? { label: versionLabel.trim() }
                                : {}),
                              data: { ...entry },
                            },
                          ],
                          _publishedVersion:
                            Math.max(
                              ...versionedDoc._versions.map((v) => v.version),
                            ) + 1,
                        },
                        null,
                        2,
                      )
                    : JSON.stringify(entry, null, 2)
                }
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

          {/* ── Version label + history (versioned entries only) ─────────────── */}
          {versionedDoc && (
            <>
              <Divider sx={{ my: 4 }} />

              {/* Optional label for the next version */}
              <TextField
                label="Version label (optional)"
                placeholder="e.g. Spring update, New hero text…"
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                size="small"
                fullWidth
                helperText="A short human-readable description saved with this version."
                sx={{ mb: 3 }}
              />

              {/* Version history panel */}
              <Button
                size="small"
                startIcon={<HistoryIcon fontSize="small" />}
                endIcon={
                  <ExpandMoreIcon
                    fontSize="small"
                    sx={{
                      transform: showVersions ? "rotate(180deg)" : "none",
                      transition: "0.2s",
                    }}
                  />
                }
                onClick={() => setShowVersions((v) => !v)}
                color="inherit"
                sx={{ color: "text.secondary", mb: 1 }}
              >
                Version history ({versionedDoc._versions.length})
              </Button>
              <Collapse in={showVersions}>
                <List
                  dense
                  disablePadding
                  sx={{
                    border: "1px solid",
                    borderColor: "grey.200",
                    borderRadius: 1,
                    overflow: "hidden",
                  }}
                >
                  {[...versionedDoc._versions].reverse().map((v, i, arr) => {
                    const isPublished =
                      v.version === versionedDoc._publishedVersion;
                    return (
                      <ListItem
                        key={v.version}
                        divider={i < arr.length - 1}
                        sx={{
                          bgcolor: isPublished ? "#f0fdf4" : "transparent",
                          py: 1.5,
                        }}
                        secondaryAction={
                          !isPublished && (
                            <Tooltip title={`Restore v${v.version} as live`}>
                              <span>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  color="inherit"
                                  startIcon={<RestoreIcon fontSize="small" />}
                                  disabled={saving || !token}
                                  onClick={() => handleRestore(v.version)}
                                  sx={{
                                    fontSize: 12,
                                    borderColor: "grey.300",
                                    color: "text.secondary",
                                  }}
                                >
                                  Restore
                                </Button>
                              </span>
                            </Tooltip>
                          )
                        }
                      >
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                              }}
                            >
                              <Typography
                                variant="body2"
                                fontWeight={600}
                                sx={{ fontFamily: '"Roboto Mono", monospace' }}
                              >
                                v{v.version}
                              </Typography>
                              {v.label && (
                                <Typography
                                  variant="body2"
                                  color="text.primary"
                                >
                                  {v.label}
                                </Typography>
                              )}
                              {isPublished && (
                                <Chip
                                  label="Live"
                                  size="small"
                                  color="success"
                                  sx={{ height: 18, fontSize: 11 }}
                                />
                              )}
                            </Box>
                          }
                          secondary={new Date(v.createdAt).toLocaleString()}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </Collapse>
            </>
          )}
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
