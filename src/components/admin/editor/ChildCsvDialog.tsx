/**
 * ChildCsvDialog.tsx
 * 4-step dialog that generates child LayoutNodes from a CSV:
 *   1. Pick which component type to use per row
 *   2. Upload CSV file
 *   3. Map CSV columns → component props
 *   4. Preview & confirm → calls onConfirm(nodes[])
 */
import { useState } from "react";
import Papa from "papaparse";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import type {
  ComponentMeta,
  LayoutNode,
} from "../../../../cms/editor/layoutSchema";
import { createNode } from "../../../../cms/editor/layoutSchema";

// ─── Load all component metadata ──────────────────────────────────────────

const metadataModules = import.meta.glob<{ default: ComponentMeta }>(
  "/cms/components/metadata/*.json",
  { eager: true },
);
const allMeta: ComponentMeta[] = Object.values(metadataModules)
  .map((m) => m.default as ComponentMeta)
  .filter(Boolean)
  .sort((a, b) => a.name.localeCompare(b.name));

// ─── Types ────────────────────────────────────────────────────────────────

type CsvRow = Record<string, string>;

interface Props {
  open: boolean;
  slotName: string;
  allowedTypes: string[];
  onClose: () => void;
  onConfirm: (nodes: LayoutNode[]) => void;
}

const STEPS = ["Choose Component", "Upload CSV", "Map Columns", "Confirm"];

// ─── Component ────────────────────────────────────────────────────────────

export function ChildCsvDialog({
  open,
  slotName,
  allowedTypes,
  onClose,
  onConfirm,
}: Props) {
  const [step, setStep] = useState(0);
  const [selectedId, setSelectedId] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parseError, setParseError] = useState("");

  // Filter components by slot's allowedTypes
  const allowed = allowedTypes.includes("*")
    ? allMeta
    : allMeta.filter((m) =>
        allowedTypes.some(
          (t) =>
            t.toLowerCase() === m.id ||
            t.toLowerCase() === m.name.toLowerCase(),
        ),
      );

  const selectedMeta = allMeta.find((m) => m.id === selectedId);
  const propKeys = selectedMeta ? Object.keys(selectedMeta.props) : [];

  function reset() {
    setStep(0);
    setSelectedId("");
    setHeaders([]);
    setRows([]);
    setMapping({});
    setParseError("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError("");
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.errors.length) {
          setParseError(result.errors[0].message);
          return;
        }
        const hdrs = result.meta.fields ?? [];
        setHeaders(hdrs);
        setRows(result.data);
        // Auto-map headers to props by normalised name match
        const auto: Record<string, string> = {};
        const currentPropKeys = selectedMeta
          ? Object.keys(selectedMeta.props)
          : [];
        hdrs.forEach((h) => {
          const norm = h.toLowerCase().replace(/[^a-z0-9]/g, "");
          const match = currentPropKeys.find(
            (p) => p.toLowerCase().replace(/[^a-z0-9]/g, "") === norm,
          );
          if (match) auto[h] = match;
        });
        setMapping(auto);
        setStep(2);
      },
      error: (err) => setParseError(err.message),
    });
    // reset input so the same file can be re-selected
    e.target.value = "";
  }

  function buildNodes(): LayoutNode[] {
    if (!selectedMeta) return [];
    return rows.map((row) => {
      const node = createNode(selectedMeta);
      for (const [csvCol, propKey] of Object.entries(mapping)) {
        if (propKey && row[csvCol] !== undefined) {
          node.props[propKey] = row[csvCol];
        }
      }
      return node;
    });
  }

  function handleConfirm() {
    onConfirm(buildNodes());
    reset();
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        Add Children from CSV
        <Typography
          variant="caption"
          color="text.secondary"
          display="block"
          sx={{ mt: 0.25 }}
        >
          Slot: <strong>{slotName}</strong>
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stepper activeStep={step} sx={{ mb: 3 }}>
          {STEPS.map((s) => (
            <Step key={s}>
              <StepLabel>{s}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* ── Step 0: Choose component ────────────────────────────────── */}
        {step === 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Select the component to use for each CSV row:
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1.5 }}>
              {allowed.map((m) => {
                const sel = selectedId === m.id;
                return (
                  <Paper
                    key={m.id}
                    variant="outlined"
                    onClick={() => setSelectedId(m.id)}
                    sx={{
                      p: 1.5,
                      cursor: "pointer",
                      minWidth: 80,
                      textAlign: "center",
                      border: "2px solid",
                      borderColor: sel ? "primary.main" : "divider",
                      bgcolor: sel ? "primary.50" : "background.paper",
                      transition: "all 0.15s",
                      "&:hover": { borderColor: "primary.light" },
                    }}
                  >
                    <Box
                      component="span"
                      className="material-icons"
                      sx={{
                        fontSize: 24,
                        color: sel ? "primary.main" : "text.secondary",
                        display: "block",
                      }}
                    >
                      {m.editor.icon}
                    </Box>
                    <Typography
                      variant="caption"
                      display="block"
                      sx={{ fontWeight: sel ? 700 : 400 }}
                    >
                      {m.name}
                    </Typography>
                  </Paper>
                );
              })}
            </Box>
          </Box>
        )}

        {/* ── Step 1: Upload CSV ──────────────────────────────────────── */}
        {step === 1 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              py: 3,
            }}
          >
            <UploadFileIcon sx={{ fontSize: 56, color: "primary.main" }} />
            <Typography variant="body1" fontWeight={600}>
              Upload a CSV file
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Each row will become one{" "}
              <strong>{selectedMeta?.name ?? selectedId}</strong> component. The
              first row must be column headers.
            </Typography>
            {parseError && (
              <Alert severity="error" sx={{ width: "100%" }}>
                {parseError}
              </Alert>
            )}
            <Button variant="contained" component="label" size="large">
              Choose CSV File
              <input
                hidden
                accept=".csv,text/csv"
                type="file"
                onChange={handleFile}
              />
            </Button>
          </Box>
        )}

        {/* ── Step 2: Map columns → props ─────────────────────────────── */}
        {step === 2 && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Map CSV columns to <strong>{selectedMeta?.name}</strong> props.
              Unmapped columns are ignored.
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.5,
                mt: 1.5,
              }}
            >
              {headers.map((h) => (
                <Box
                  key={h}
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <Typography
                    variant="body2"
                    sx={{ flex: 1, fontFamily: "monospace", fontSize: 12 }}
                  >
                    {h}
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    →
                  </Typography>
                  <TextField
                    select
                    size="small"
                    value={mapping[h] ?? ""}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [h]: e.target.value }))
                    }
                    sx={{ minWidth: 160 }}
                  >
                    <MenuItem value="">— ignore —</MenuItem>
                    {propKeys.map((p) => (
                      <MenuItem key={p} value={p}>
                        {p}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>
              ))}
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 2 }}
            >
              {rows.length} row{rows.length !== 1 ? "s" : ""} will be imported.
            </Typography>
          </Box>
        )}

        {/* ── Step 3: Preview & confirm ───────────────────────────────── */}
        {step === 3 && (
          <Box>
            <Typography variant="body2" gutterBottom>
              <strong>{rows.length}</strong>{" "}
              <strong>{selectedMeta?.name}</strong> component
              {rows.length !== 1 ? "s" : ""} will be added to the{" "}
              <strong>{slotName}</strong> slot:
            </Typography>
            <Box
              sx={{
                mt: 1,
                maxHeight: 240,
                overflowY: "auto",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 1,
              }}
            >
              {buildNodes()
                .slice(0, 20)
                .map((n, i) => {
                  const summary = Object.entries(n.props)
                    .filter(
                      ([, v]) => v !== null && v !== undefined && v !== "",
                    )
                    .slice(0, 4)
                    .map(([k, v]) => `${k}: ${String(v).slice(0, 30)}`)
                    .join("  ·  ");
                  return (
                    <Box
                      key={n.id}
                      sx={{
                        px: 1.5,
                        py: 0.75,
                        fontSize: 12,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        gap: 1,
                      }}
                    >
                      <Typography
                        variant="caption"
                        color="text.disabled"
                        sx={{ minWidth: 20 }}
                      >
                        {i + 1}.
                      </Typography>
                      <Typography variant="caption">
                        {summary || "(no mapped props)"}
                      </Typography>
                    </Box>
                  );
                })}
              {rows.length > 20 && (
                <Box
                  sx={{
                    px: 1.5,
                    py: 0.75,
                    fontSize: 12,
                    color: "text.secondary",
                  }}
                >
                  … and {rows.length - 20} more
                </Box>
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={handleClose} color="inherit">
          Cancel
        </Button>
        {step > 0 && step !== 1 && (
          <Button onClick={() => setStep(step - 1)}>Back</Button>
        )}
        <Box sx={{ flex: 1 }} />
        {step === 0 && (
          <Button
            variant="contained"
            disabled={!selectedId}
            onClick={() => setStep(1)}
          >
            Next: Upload CSV →
          </Button>
        )}
        {step === 1 && (
          <Typography variant="caption" color="text.secondary">
            Select a file to continue…
          </Typography>
        )}
        {step === 2 && (
          <Button
            variant="contained"
            disabled={rows.length === 0}
            onClick={() => setStep(3)}
          >
            Preview →
          </Button>
        )}
        {step === 3 && (
          <Button variant="contained" color="primary" onClick={handleConfirm}>
            Add {rows.length} Component{rows.length !== 1 ? "s" : ""}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
