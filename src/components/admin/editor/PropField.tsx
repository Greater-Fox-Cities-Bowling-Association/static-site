/**
 * PropField.tsx
 * Shared prop-field widget used by PropEditor (Layout tab) and ContentEditor (Content tab).
 * Also exports the eagerly-loaded component metadata registry.
 */
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import DeleteIcon from "@mui/icons-material/Delete";
import type {
  ComponentMeta,
  PropMeta,
} from "../../../../cms/editor/layoutSchema";

// ─── Shared metadata registry ─────────────────────────────────────────────

const metadataModules = import.meta.glob<{ default: ComponentMeta }>(
  "/cms/components/metadata/*.json",
  { eager: true },
);

export const metaByComponentId: Record<string, ComponentMeta> = {};
for (const mod of Object.values(metadataModules)) {
  const m = mod.default as ComponentMeta;
  if (m?.id) metaByComponentId[m.id] = m;
}

export const allComponentMeta: ComponentMeta[] = Object.values(
  metaByComponentId,
).sort((a, b) => a.name.localeCompare(b.name));

// ─── PropField widget ─────────────────────────────────────────────────────

export interface PropFieldProps {
  name: string;
  meta: PropMeta;
  value: unknown;
  onChange: (val: unknown) => void;
}

export function PropField({ name, meta, value, onChange }: PropFieldProps) {
  const label = name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase());

  switch (meta.type) {
    case "boolean":
      return (
        <FormControlLabel
          control={
            <Switch
              checked={!!value}
              onChange={(e) => onChange(e.target.checked)}
              size="small"
            />
          }
          label={<Typography variant="body2">{label}</Typography>}
          sx={{ mb: 1 }}
        />
      );

    case "number":
    case "spacing":
    case "shadow": {
      const num = typeof value === "number" ? value : 0;
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Slider
              value={num}
              min={0}
              max={
                meta.type === "shadow" ? 24 : meta.type === "spacing" ? 10 : 100
              }
              step={1}
              size="small"
              onChange={(_, v) => onChange(v)}
              sx={{ flex: 1 }}
            />
            <Typography
              variant="body2"
              sx={{ minWidth: 24, textAlign: "right" }}
            >
              {num}
            </Typography>
          </Box>
        </Box>
      );
    }

    case "color":
      return (
        <Box sx={{ mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary">
            {label}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}>
            <Box
              component="input"
              type="color"
              value={
                typeof value === "string" && value.startsWith("#")
                  ? value
                  : "#1976d2"
              }
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange(e.target.value)
              }
              style={{
                width: 36,
                height: 28,
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            />
            <TextField
              size="small"
              value={(value as string) ?? ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="e.g. #1976d2 or primary.main"
              sx={{ flex: 1 }}
              inputProps={{ style: { fontSize: 12 } }}
            />
          </Box>
        </Box>
      );

    case "radius":
      return (
        <TextField
          select
          size="small"
          label={label}
          value={(value as string) ?? "none"}
          onChange={(e) => onChange(e.target.value)}
          fullWidth
          sx={{ mb: 1.5 }}
        >
          {["none", "sm", "md", "lg", "xl", "full"].map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </TextField>
      );

    case "array": {
      const arr = Array.isArray(value)
        ? (value as Record<string, unknown>[])
        : [];
      const shape = meta.itemShape ?? {};
      const shapeEntries = Object.entries(shape);
      // Singular label by stripping trailing 's'
      const singular = label.replace(/s$/i, "");

      function addItem() {
        const newItem: Record<string, unknown> = {};
        for (const [k, m] of shapeEntries) newItem[k] = m.default;
        onChange([...arr, newItem]);
      }

      return (
        <Box sx={{ mb: 1.5 }}>
          {/* header row */}
          <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ flex: 1 }}
            >
              {label}{" "}
              <Box component="span" sx={{ color: "text.disabled" }}>
                ({arr.length})
              </Box>
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={addItem}
              sx={{
                textTransform: "none",
                fontSize: 11,
                minWidth: 0,
                px: 1,
                py: 0.25,
              }}
            >
              + Add {singular}
            </Button>
          </Box>

          {/* item rows */}
          {arr.length === 0 ? (
            <Box
              sx={{
                border: "1px dashed",
                borderColor: "grey.300",
                borderRadius: 1,
                p: 1,
                textAlign: "center",
              }}
            >
              <Typography variant="caption" color="text.disabled">
                No {label.toLowerCase()} yet.
              </Typography>
            </Box>
          ) : (
            arr.map((item, i) => (
              <Box
                key={i}
                sx={{
                  border: "1px solid",
                  borderColor: "grey.200",
                  borderRadius: 1,
                  p: 1,
                  mb: 0.5,
                  bgcolor: "grey.50",
                }}
              >
                {/* item header */}
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    mb: shapeEntries.length > 0 ? 0.75 : 0,
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ flex: 1 }}
                  >
                    {singular} {i + 1}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => onChange(arr.filter((_, j) => j !== i))}
                    sx={{ p: 0.25 }}
                  >
                    <DeleteIcon sx={{ fontSize: 13 }} />
                  </IconButton>
                </Box>

                {/* item fields */}
                {shapeEntries.length > 0 ? (
                  shapeEntries.map(([field, fieldMeta]) => (
                    <PropField
                      key={field}
                      name={field}
                      meta={fieldMeta}
                      value={item[field] ?? fieldMeta.default}
                      onChange={(v) =>
                        onChange(
                          arr.map((it, j) =>
                            j === i ? { ...it, [field]: v } : it,
                          ),
                        )
                      }
                    />
                  ))
                ) : (
                  // No itemShape → treat item as a plain string
                  <TextField
                    size="small"
                    value={typeof item === "string" ? item : String(item ?? "")}
                    onChange={(e) =>
                      onChange(
                        (arr as unknown[]).map((it, j) =>
                          j === i ? e.target.value : it,
                        ),
                      )
                    }
                    fullWidth
                    sx={{ mb: 0.5 }}
                    inputProps={{ style: { fontSize: 12 } }}
                  />
                )}
              </Box>
            ))
          )}
        </Box>
      );
    }

    default:
      // string (with or without options)
      if (meta.options && meta.options.length > 0) {
        return (
          <TextField
            select
            size="small"
            label={label}
            value={(value as string) ?? meta.default ?? ""}
            onChange={(e) => onChange(e.target.value)}
            fullWidth
            sx={{ mb: 1.5 }}
          >
            {meta.options.map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </TextField>
        );
      }
      return (
        <TextField
          size="small"
          label={label}
          value={
            typeof value === "string"
              ? value
              : typeof value === "object"
                ? JSON.stringify(value, null, 2)
                : String(value ?? "")
          }
          onChange={(e) => {
            // Try parsing as JSON for array/object props
            try {
              const parsed = JSON.parse(e.target.value);
              onChange(parsed);
            } catch {
              onChange(e.target.value);
            }
          }}
          fullWidth
          multiline={typeof value === "object"}
          minRows={typeof value === "object" ? 3 : 1}
          sx={{ mb: 1.5 }}
          inputProps={{ style: { fontSize: 12 } }}
        />
      );
  }
}
