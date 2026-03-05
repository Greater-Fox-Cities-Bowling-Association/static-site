/**
 * DynamicForm.tsx
 * Renders an MUI form from a CmsSchema definition.
 * Supports field types: text, textarea, number, boolean, slug, date, array.
 */
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormHelperText from "@mui/material/FormHelperText";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import Paper from "@mui/material/Paper";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import type { CmsField, CmsEntry, CmsSchema } from "../../../../cms/types";
import { ArrayCsvImporter } from "../csv/ArrayCsvImporter";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toSlug(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── SubComponents ────────────────────────────────────────────────────────────

interface FieldProps {
  field: CmsField;
  value: unknown;
  onChange: (val: unknown) => void;
  error?: string;
  /** The current value of the title/first-text field, used for slug auto-derive */
  titleValue?: string;
  /** All available schemas — needed to render schema-typed array items */
  allSchemas?: CmsSchema[];
}

function SlugField({ field, value, onChange, error, titleValue }: FieldProps) {
  const [manuallyEdited, setManuallyEdited] = useState(false);
  const strVal = typeof value === "string" ? value : "";

  // Auto-derive slug from title until the user manually edits it
  useEffect(() => {
    if (!manuallyEdited && titleValue !== undefined) {
      onChange(toSlug(titleValue));
    }
  }, [titleValue, manuallyEdited]);

  return (
    <TextField
      value={strVal}
      onChange={(e) => {
        setManuallyEdited(true);
        onChange(toSlug(e.target.value));
      }}
      fullWidth
      size="medium"
      variant="outlined"
      error={!!error}
      helperText={
        error ?? field.helpText ?? `Your entry will be at: /${strVal || "…"}`
      }
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Typography variant="body2" color="text.secondary">
              /
            </Typography>
          </InputAdornment>
        ),
      }}
    />
  );
}

function ArrayField({ field, value, onChange, error, allSchemas }: FieldProps) {
  const referencedSchema = field.ofSchema
    ? (allSchemas ?? []).find((s) => s.id === field.ofSchema)
    : undefined;
  const itemType = field.of ?? "text";
  const items: unknown[] = Array.isArray(value) ? (value as unknown[]) : [];
  const [csvMode, setCsvMode] = useState<"append" | "replace" | null>(null);

  function handleCsvAppend(newItems: unknown[]) {
    onChange([...items, ...newItems]);
  }

  function handleCsvReplace(newItems: unknown[]) {
    onChange(newItems);
  }

  function defaultValue(): unknown {
    if (referencedSchema) return {};
    switch (itemType) {
      case "number":
        return 0;
      case "boolean":
        return false;
      default:
        return "";
    }
  }

  function update(index: number, val: unknown) {
    const next = [...items];
    next[index] = val;
    onChange(next);
  }

  function add() {
    onChange([...items, defaultValue()]);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  // ── Object items (schema-typed) ───────────────────────────────────────────
  if (referencedSchema) {
    const objectItems: Record<string, unknown>[] = items.map((item) =>
      typeof item === "object" && item !== null && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {},
    );
    return (
      <Box>
        {objectItems.map((obj, idx) => (
          <Paper
            key={idx}
            variant="outlined"
            sx={{ p: 2, mb: 2, borderRadius: 2 }}
          >
            <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ flex: 1, fontWeight: 600 }}
              >
                {referencedSchema.name} #{idx + 1}
              </Typography>
              <IconButton
                size="small"
                color="error"
                onClick={() => remove(idx)}
                title="Remove"
              >
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Box>
            <DynamicForm
              fields={referencedSchema.fields}
              value={obj}
              onChange={(updated) => update(idx, updated)}
              allSchemas={allSchemas}
            />
          </Paper>
        ))}
        {error && (
          <FormHelperText error sx={{ mb: 1 }}>
            {error}
          </FormHelperText>
        )}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button
            size="small"
            startIcon={<AddIcon />}
            onClick={add}
            variant="outlined"
          >
            Add {referencedSchema.name}
          </Button>
          <Button
            size="small"
            startIcon={<FileUploadIcon />}
            onClick={() => setCsvMode("replace")}
            variant="outlined"
            color="warning"
          >
            Replace with CSV
          </Button>
          <Button
            size="small"
            startIcon={<FileUploadIcon />}
            onClick={() => setCsvMode("append")}
            variant="outlined"
            color="secondary"
          >
            Append from CSV
          </Button>
        </Box>

        <Dialog
          open={csvMode !== null}
          onClose={() => setCsvMode(null)}
          maxWidth="md"
          fullWidth
          PaperProps={{ sx: { borderRadius: 3 } }}
        >
          {csvMode !== null && (
            <ArrayCsvImporter
              field={field}
              allSchemas={allSchemas}
              mode={csvMode}
              onAppend={handleCsvAppend}
              onReplace={handleCsvReplace}
              onClose={() => setCsvMode(null)}
            />
          )}
        </Dialog>
      </Box>
    );
  }

  // ── Primitive items ───────────────────────────────────────────────────────
  function renderItemInput(item: unknown, idx: number) {
    switch (itemType) {
      case "boolean":
        return (
          <FormControlLabel
            control={
              <Switch
                checked={!!item}
                onChange={(e) => update(idx, e.target.checked)}
                size="small"
              />
            }
            label={
              <Typography variant="body2">{item ? "Yes" : "No"}</Typography>
            }
            sx={{ flex: 1 }}
          />
        );
      case "number":
        return (
          <TextField
            value={item ?? 0}
            onChange={(e) =>
              update(idx, e.target.value === "" ? 0 : Number(e.target.value))
            }
            type="number"
            fullWidth
            size="small"
            variant="outlined"
            placeholder={`Item ${idx + 1}`}
          />
        );
      case "textarea":
        return (
          <TextField
            value={typeof item === "string" ? item : ""}
            onChange={(e) => update(idx, e.target.value)}
            fullWidth
            multiline
            rows={3}
            size="small"
            variant="outlined"
            placeholder={`Item ${idx + 1}`}
          />
        );
      case "date":
        return (
          <TextField
            value={typeof item === "string" ? item : ""}
            onChange={(e) => update(idx, e.target.value)}
            type="date"
            fullWidth
            size="small"
            variant="outlined"
            InputLabelProps={{ shrink: true }}
          />
        );
      default: // text, slug
        return (
          <TextField
            value={typeof item === "string" ? item : ""}
            onChange={(e) => update(idx, e.target.value)}
            fullWidth
            size="small"
            variant="outlined"
            placeholder={`Item ${idx + 1}`}
          />
        );
    }
  }

  return (
    <Box>
      {items.map((item, idx) => (
        <Box
          key={idx}
          sx={{
            display: "flex",
            alignItems:
              itemType === "textarea" || itemType === "boolean"
                ? "flex-start"
                : "center",
            gap: 1,
            mb: 1,
          }}
        >
          {renderItemInput(item, idx)}
          <IconButton
            size="small"
            color="error"
            onClick={() => remove(idx)}
            title="Remove"
            sx={itemType === "textarea" ? { mt: 0.5 } : {}}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </Box>
      ))}
      {error && (
        <FormHelperText error sx={{ mb: 1 }}>
          {error}
        </FormHelperText>
      )}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={add}
          variant="outlined"
        >
          Add item
        </Button>
        <Button
          size="small"
          startIcon={<FileUploadIcon />}
          onClick={() => setCsvMode("replace")}
          variant="outlined"
          color="warning"
        >
          Replace with CSV
        </Button>
        <Button
          size="small"
          startIcon={<FileUploadIcon />}
          onClick={() => setCsvMode("append")}
          variant="outlined"
          color="secondary"
        >
          Append from CSV
        </Button>
      </Box>

      <Dialog
        open={csvMode !== null}
        onClose={() => setCsvMode(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        {csvMode !== null && (
          <ArrayCsvImporter
            field={field}
            allSchemas={allSchemas}
            mode={csvMode}
            onAppend={handleCsvAppend}
            onReplace={handleCsvReplace}
            onClose={() => setCsvMode(null)}
          />
        )}
      </Dialog>
    </Box>
  );
}

function FieldInput({
  field,
  value,
  onChange,
  error,
  titleValue,
  allSchemas,
}: FieldProps) {
  switch (field.type) {
    case "boolean":
      return (
        <Box>
          <FormControlLabel
            control={
              <Switch
                checked={!!value}
                onChange={(e) => onChange(e.target.checked)}
              />
            }
            label={
              <Typography variant="body2">{value ? "Yes" : "No"}</Typography>
            }
          />
          {field.helpText && <FormHelperText>{field.helpText}</FormHelperText>}
          {error && <FormHelperText error>{error}</FormHelperText>}
        </Box>
      );

    case "slug":
      return (
        <SlugField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          titleValue={titleValue}
        />
      );

    case "array":
      return (
        <ArrayField
          field={field}
          value={value}
          onChange={onChange}
          error={error}
          allSchemas={allSchemas}
        />
      );

    case "textarea": {
      const strVal = typeof value === "string" ? value : "";
      const charCount = strVal.length;
      const hasMax = !!field.maxLength;
      const overLimit = hasMax && charCount > (field.maxLength ?? 0);
      return (
        <TextField
          value={strVal}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          multiline
          rows={field.name === "body" ? 12 : 3}
          size="medium"
          variant="outlined"
          error={!!error || overLimit}
          helperText={
            error ??
            (hasMax
              ? `${field.helpText ?? ""} (${charCount} / ${field.maxLength})`
              : field.helpText)
          }
        />
      );
    }

    case "number":
      return (
        <TextField
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? "" : Number(e.target.value))
          }
          type="number"
          fullWidth
          size="medium"
          variant="outlined"
          error={!!error}
          helperText={error ?? field.helpText}
        />
      );

    case "date":
      return (
        <TextField
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          type="date"
          fullWidth
          size="medium"
          variant="outlined"
          error={!!error}
          helperText={error ?? field.helpText}
          InputLabelProps={{ shrink: true }}
        />
      );

    // 'text' default
    default:
      return (
        <TextField
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          size="medium"
          variant="outlined"
          error={!!error}
          helperText={error ?? field.helpText}
        />
      );
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface DynamicFormProps {
  fields: CmsField[];
  value: CmsEntry;
  onChange: (updated: CmsEntry) => void;
  errors?: Record<string, string>;
  /** All available schemas — passed down so array fields can render nested sub-forms */
  allSchemas?: CmsSchema[];
}

export function DynamicForm({
  fields,
  value,
  onChange,
  errors = {},
  allSchemas,
}: DynamicFormProps) {
  function handleFieldChange(name: string, fieldValue: unknown) {
    onChange({ ...value, [name]: fieldValue });
  }

  // Find the first 'text' field — used to auto-derive slug
  const firstTextField = fields.find((f) => f.type === "text");
  const titleValue = firstTextField
    ? String(value[firstTextField.name] ?? "")
    : undefined;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {fields.map((field, idx) => (
        <Box key={field.name}>
          {idx > 0 && field.type !== "boolean" && <Divider sx={{ mb: 3 }} />}
          <Typography
            variant="overline"
            color="text.secondary"
            sx={{
              fontWeight: 700,
              letterSpacing: 1,
              display: "block",
              mb: 0.75,
            }}
          >
            {field.label}
            {field.required && (
              <Typography component="span" color="error.main" sx={{ ml: 0.5 }}>
                *
              </Typography>
            )}
          </Typography>
          <FieldInput
            field={field}
            value={value[field.name]}
            onChange={(v) => handleFieldChange(field.name, v)}
            error={errors[field.name]}
            titleValue={field.type === "slug" ? titleValue : undefined}
            allSchemas={allSchemas}
          />
        </Box>
      ))}
    </Box>
  );
}
