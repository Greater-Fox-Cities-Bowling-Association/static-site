/**
 * PropField.tsx
 * Shared prop-field widget used by PropEditor (Layout tab) and ContentEditor (Content tab).
 * Also exports the eagerly-loaded component metadata registry.
 */
import Box from "@mui/material/Box";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
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
