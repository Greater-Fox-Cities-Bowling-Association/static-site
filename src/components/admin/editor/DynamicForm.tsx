/**
 * DynamicForm.tsx
 * Renders an MUI form from a CmsSchema definition.
 * Supports field types: text, textarea, number, boolean, slug, date, array.
 */
import { useEffect, useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
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
import type { CmsField, CmsEntry } from "../../../../cms/types";

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

function ArrayField({ field, value, onChange, error }: FieldProps) {
  const items: string[] = Array.isArray(value)
    ? (value as string[]).map(String)
    : [];

  function update(index: number, val: string) {
    const next = [...items];
    next[index] = val;
    onChange(next);
  }

  function add() {
    onChange([...items, ""]);
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <Box>
      {items.map((item, idx) => (
        <Box
          key={idx}
          sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
        >
          <TextField
            value={item}
            onChange={(e) => update(idx, e.target.value)}
            fullWidth
            size="small"
            variant="outlined"
            placeholder={`Item ${idx + 1}`}
          />
          <IconButton
            size="small"
            color="error"
            onClick={() => remove(idx)}
            title="Remove"
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
      <Button
        size="small"
        startIcon={<AddIcon />}
        onClick={add}
        variant="outlined"
      >
        Add item
      </Button>
    </Box>
  );
}

function FieldInput({ field, value, onChange, error, titleValue }: FieldProps) {
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
}

export function DynamicForm({
  fields,
  value,
  onChange,
  errors = {},
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
          />
        </Box>
      ))}
    </Box>
  );
}
