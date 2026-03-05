/**
 * SchemaEditor.tsx
 * GUI for creating and editing a CmsSchema (content type definition).
 * Saves the schema JSON to cms/schemas/{id}.schema.json in GitHub.
 */
import { useState } from "react";
import Alert from "@mui/material/Alert";
import Autocomplete from "@mui/material/Autocomplete";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { commitFiles } from "../../../../cms/github/github";
import type { CmsField, CmsFieldType, CmsSchema } from "../../../../cms/types";

const REPO = import.meta.env.PUBLIC_GITHUB_REPO as string;
const BRANCH = import.meta.env.PUBLIC_GITHUB_BRANCH as string;

const FIELD_TYPES: { value: CmsFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Text area (long text)" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean (yes / no)" },
  { value: "slug", label: "Slug (URL-safe ID)" },
  { value: "date", label: "Date" },
  { value: "array", label: "List (array of items)" },
];

type NonArrayFieldType = Exclude<CmsFieldType, "array">;

const PRIMITIVE_ITEM_TYPES: { value: NonArrayFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "textarea", label: "Text area" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Boolean" },
  { value: "slug", label: "Slug" },
  { value: "date", label: "Date" },
];

/** Encode a schema reference as a dropdown value */
function schemaKey(id: string) {
  return `schema:${id}`;
}

/** Derive the current dropdown value for a field's item type */
function itemTypeValue(field: CmsField): string {
  if (field.ofSchema) return schemaKey(field.ofSchema);
  return field.of ?? "text";
}

function toId(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

interface Props {
  /** Pass null to create a new schema */
  initialSchema: CmsSchema | null;
  token: string | null;
  onBack: () => void;
  onSaved: (schema: CmsSchema) => void;
  /** All currently defined schemas — used to populate the "Item type" dropdown */
  allSchemas?: CmsSchema[];
}

export function SchemaEditor({
  initialSchema,
  token,
  onBack,
  onSaved,
  allSchemas = [],
}: Props) {
  const isNew = initialSchema === null;

  const [name, setName] = useState(initialSchema?.name ?? "");
  const [idEdited, setIdEdited] = useState(!isNew);
  const [id, setId] = useState(initialSchema?.id ?? "");
  const [group, setGroup] = useState(initialSchema?.group ?? "");
  const [fields, setFields] = useState<CmsField[]>(initialSchema?.fields ?? []);

  // Derive unique group names from all existing schemas for autocomplete suggestions
  const existingGroups = Array.from(
    new Set(allSchemas.map((s) => s.group ?? "").filter(Boolean)),
  ).sort();

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  function handleNameChange(v: string) {
    setName(v);
    if (!idEdited) setId(toId(v));
  }

  function handleIdChange(v: string) {
    setIdEdited(true);
    setId(toId(v));
  }

  function addField() {
    const newField: CmsField = {
      name: `field${fields.length + 1}`,
      label: `Field ${fields.length + 1}`,
      type: "text",
      required: false,
    };
    setFields((prev) => [...prev, newField]);
  }

  function updateField(index: number, patch: Partial<CmsField>) {
    setFields((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    );
  }

  function removeField(index: number) {
    setFields((prev) => prev.filter((_, i) => i !== index));
  }

  function moveField(index: number, dir: -1 | 1) {
    const next = [...fields];
    const swapWith = index + dir;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    setFields(next);
  }

  async function handleSave() {
    if (!token) return;
    if (!name.trim()) {
      setError("Schema name is required.");
      return;
    }
    if (!id.trim()) {
      setError("Schema ID is required.");
      return;
    }
    if (fields.length === 0) {
      setError("Add at least one field.");
      return;
    }
    for (const f of fields) {
      if (!f.name.trim()) {
        setError("All fields must have a name.");
        return;
      }
      if (!f.label.trim()) {
        setError("All fields must have a label.");
        return;
      }
    }

    const schema: CmsSchema = {
      id,
      name,
      ...(group.trim() ? { group: group.trim() } : {}),
      directory: `src/content/${id}`,
      fields,
    };

    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await commitFiles(token, REPO, BRANCH, [
        {
          path: `cms/schemas/${id}.schema.json`,
          content: JSON.stringify(schema, null, 2),
          message: `cms: ${isNew ? "create" : "update"} schema "${name}"`,
        },
      ]);
      setSaved(true);
      onSaved(schema);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
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
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Tooltip title="Back to Content Models">
          <IconButton size="small" onClick={onBack}>
            <ArrowBackIcon />
          </IconButton>
        </Tooltip>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {isNew ? "New Content Model" : `Edit: ${initialSchema.name}`}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {isNew
              ? "Define the fields for this content type"
              : `cms/schemas/${id}.schema.json`}
          </Typography>
        </Box>
        {saved && !saving && (
          <Chip
            icon={<CheckCircleOutlineIcon />}
            label="Saved"
            color="success"
            size="small"
            variant="outlined"
          />
        )}
        <Tooltip title={!token ? "Log in first" : `Save schema to ${BRANCH}`}>
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
              {saving ? "Saving…" : "Save schema"}
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

      <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 2, sm: 4 } }}>
        <Box
          sx={{
            maxWidth: 860,
            mx: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {/* ── Identity ── */}
          <Box>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              Model Identity
            </Typography>
            <Box
              sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}
            >
              <TextField
                label="Name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                helperText="Human-readable, shown in the sidebar"
                size="small"
                fullWidth
              />
              <TextField
                label="ID"
                value={id}
                onChange={(e) => handleIdChange(e.target.value)}
                helperText={`Content stored at: src/content/${id || "…"}/`}
                size="small"
                fullWidth
                disabled={!isNew}
              />
              <Autocomplete
                freeSolo
                options={existingGroups}
                value={group}
                onInputChange={(_, v) => setGroup(v)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Group"
                    size="small"
                    helperText="Optional — organizes this type in the sidebar"
                    fullWidth
                  />
                )}
              />
            </Box>
          </Box>

          <Divider />

          {/* ── Fields ── */}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", mb: 2, gap: 2 }}>
              <Typography variant="h6" fontWeight={700} sx={{ flex: 1 }}>
                Fields
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon />}
                onClick={addField}
              >
                Add field
              </Button>
            </Box>

            {fields.length === 0 && (
              <Box
                sx={{
                  textAlign: "center",
                  py: 6,
                  border: "2px dashed",
                  borderColor: "grey.200",
                  borderRadius: 3,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  No fields yet. Click "Add field" to get started.
                </Typography>
              </Box>
            )}

            {fields.length > 0 && (
              <Paper
                variant="outlined"
                sx={{ borderRadius: 3, overflow: "hidden" }}
              >
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: "grey.50" }}>
                      <TableCell sx={{ fontWeight: 700, width: 40 }} />
                      <TableCell sx={{ fontWeight: 700 }}>Field name</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Label</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Item type</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 80 }}>
                        Required
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Help text</TableCell>
                      <TableCell sx={{ width: 80 }} />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {fields.map((field, idx) => (
                      <TableRow key={idx} hover>
                        {/* Reorder */}
                        <TableCell>
                          <Box
                            sx={{ display: "flex", flexDirection: "column" }}
                          >
                            <IconButton
                              size="small"
                              disabled={idx === 0}
                              onClick={() => moveField(idx, -1)}
                            >
                              <ArrowUpwardIcon fontSize="inherit" />
                            </IconButton>
                            <IconButton
                              size="small"
                              disabled={idx === fields.length - 1}
                              onClick={() => moveField(idx, 1)}
                            >
                              <ArrowDownwardIcon fontSize="inherit" />
                            </IconButton>
                          </Box>
                        </TableCell>
                        {/* Name */}
                        <TableCell>
                          <TextField
                            value={field.name}
                            onChange={(e) =>
                              updateField(idx, {
                                name: e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9_]/g, "_"),
                              })
                            }
                            size="small"
                            fullWidth
                            inputProps={{ style: { fontFamily: "monospace" } }}
                          />
                        </TableCell>
                        {/* Label */}
                        <TableCell>
                          <TextField
                            value={field.label}
                            onChange={(e) =>
                              updateField(idx, { label: e.target.value })
                            }
                            size="small"
                            fullWidth
                          />
                        </TableCell>
                        {/* Type */}
                        <TableCell>
                          <TextField
                            select
                            value={field.type}
                            onChange={(e) =>
                              updateField(idx, {
                                type: e.target.value as CmsFieldType,
                                // clear 'of' when switching away from array
                                ...(e.target.value !== "array"
                                  ? { of: undefined }
                                  : {}),
                              })
                            }
                            size="small"
                            fullWidth
                          >
                            {FIELD_TYPES.map((t) => (
                              <MenuItem key={t.value} value={t.value}>
                                {t.label}
                              </MenuItem>
                            ))}
                          </TextField>
                        </TableCell>
                        {/* Item type — only active for array fields */}
                        <TableCell>
                          {field.type === "array" ? (
                            <TextField
                              select
                              value={itemTypeValue(field)}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val.startsWith("schema:")) {
                                  updateField(idx, {
                                    ofSchema: val.slice(7),
                                    of: undefined,
                                  });
                                } else {
                                  updateField(idx, {
                                    of: val as NonArrayFieldType,
                                    ofSchema: undefined,
                                  });
                                }
                              }}
                              size="small"
                              fullWidth
                            >
                              {PRIMITIVE_ITEM_TYPES.map((t) => (
                                <MenuItem key={t.value} value={t.value}>
                                  {t.label}
                                </MenuItem>
                              ))}
                              {allSchemas.length > 0 && [
                                <Divider key="__divider" />,
                                ...allSchemas.map((s) => (
                                  <MenuItem
                                    key={schemaKey(s.id)}
                                    value={schemaKey(s.id)}
                                  >
                                    {s.name}
                                  </MenuItem>
                                )),
                              ]}
                            </TextField>
                          ) : (
                            <Typography
                              variant="body2"
                              color="text.disabled"
                              sx={{ pl: 1 }}
                            >
                              —
                            </Typography>
                          )}
                        </TableCell>
                        {/* Required */}
                        <TableCell align="center">
                          <Switch
                            size="small"
                            checked={!!field.required}
                            onChange={(e) =>
                              updateField(idx, { required: e.target.checked })
                            }
                          />
                        </TableCell>
                        {/* Help text */}
                        <TableCell>
                          <TextField
                            value={field.helpText ?? ""}
                            onChange={(e) =>
                              updateField(idx, { helpText: e.target.value })
                            }
                            size="small"
                            fullWidth
                            placeholder="Optional hint shown below the field"
                          />
                        </TableCell>
                        {/* Remove */}
                        <TableCell>
                          <Tooltip title="Remove field">
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => removeField(idx)}
                            >
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
