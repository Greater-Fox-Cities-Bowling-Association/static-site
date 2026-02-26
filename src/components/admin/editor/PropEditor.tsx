/**
 * PropEditor.tsx
 * Right panel — shows editable fields for the selected node's props.
 * Each prop is rendered according to its type from component metadata.
 */
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useEditor, useUpdateProps } from "./EditorContext";
import { EventEditor } from "./EventEditor";
import type {
  ComponentMeta,
  PropMeta,
} from "../../../../cms/editor/layoutSchema";

// ─── Individual prop widgets ───────────────────────────────────────────────

interface PropFieldProps {
  name: string;
  meta: PropMeta;
  value: unknown;
  onChange: (val: unknown) => void;
}

function PropField({ name, meta, value, onChange }: PropFieldProps) {
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

// ─── Main panel ───────────────────────────────────────────────────────────

// Load metadata — dynamic import from the metadata files
// We'll use a lazy registry import for the editor
const metadataModules = import.meta.glob<{ default: ComponentMeta }>(
  "/cms/components/metadata/*.json",
  { eager: true },
);
const metaByComponentId: Record<string, ComponentMeta> = {};
for (const mod of Object.values(metadataModules)) {
  const m = mod.default as ComponentMeta;
  if (m?.id) metaByComponentId[m.id] = m;
}

export function PropEditor() {
  const { selectedNode } = useEditor();
  const updateProps = useUpdateProps(selectedNode?.id ?? "");

  if (!selectedNode) {
    return (
      <Box
        sx={{
          width: 260,
          flexShrink: 0,
          borderLeft: 1,
          borderColor: "divider",
          p: 2,
        }}
      >
        <Typography variant="body2" color="text.disabled">
          Select a component on the canvas to edit its properties.
        </Typography>
      </Box>
    );
  }

  const meta = metaByComponentId[selectedNode.componentId];

  return (
    <Box
      sx={{
        width: 260,
        flexShrink: 0,
        borderLeft: 1,
        borderColor: "divider",
        overflowY: "auto",
      }}
    >
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="subtitle2">
          {meta?.name ?? selectedNode.componentId}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {selectedNode.id}
        </Typography>
      </Box>

      <Box sx={{ p: 2 }}>
        <Typography variant="overline">Props</Typography>
        {meta ? (
          Object.entries(meta.props).map(([key, propMeta]) => (
            <PropField
              key={key}
              name={key}
              meta={propMeta}
              value={selectedNode.props[key] ?? propMeta.default}
              onChange={(val) => updateProps({ [key]: val })}
            />
          ))
        ) : (
          <Typography variant="body2" color="text.disabled">
            No metadata found.
          </Typography>
        )}
      </Box>

      {meta && Object.keys(meta.events).length > 0 && (
        <>
          <Divider />
          <EventEditor node={selectedNode} meta={meta} />
        </>
      )}
    </Box>
  );
}
