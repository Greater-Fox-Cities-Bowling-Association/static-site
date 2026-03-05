/**
 * ArrayCsvImporter
 * Inline CSV importer for array fields in DynamicForm.
 * Lets users upload a CSV, map columns to the list item's schema fields,
 * preview the result, then append all rows to the existing list.
 *
 * Works for both:
 *   - Schema-typed arrays (field.ofSchema) — maps columns to each sub-field name
 *   - Primitive arrays (field.of) — maps one column to the item value
 */
import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import type { CmsField, CmsSchema } from "../../../../cms/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Row = Record<string, string>;

export interface ArrayCsvImporterProps {
  /** The array field definition being populated */
  field: CmsField;
  /** All available schemas — needed to resolve ofSchema field definitions */
  allSchemas?: CmsSchema[];
  /** "append" adds rows after the existing list; "replace" replaces it entirely */
  mode: "append" | "replace";
  /** Called with the parsed & mapped items when mode is "append" */
  onAppend: (items: unknown[]) => void;
  /** Called with the parsed & mapped items when mode is "replace" */
  onReplace: (items: unknown[]) => void;
  /** Called when the user cancels or finishes */
  onClose: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STEPS_APPEND = ["Upload CSV", "Map columns", "Preview & append"];
const STEPS_REPLACE = ["Upload CSV", "Map columns", "Preview & replace"];

/** The "skip" sentinel value used in mapping dropdowns */
const SKIP = "__skip__";

/** Coerce a string to the correct primitive type */
function coerce(raw: string, type: string): unknown {
  if (type === "number") {
    const n = Number(raw);
    return isNaN(n) ? 0 : n;
  }
  if (type === "boolean") return raw.trim().toLowerCase() === "true";
  return raw;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ArrayCsvImporter({
  field,
  allSchemas = [],
  mode,
  onAppend,
  onReplace,
  onClose,
}: ArrayCsvImporterProps) {
  const STEPS = mode === "replace" ? STEPS_REPLACE : STEPS_APPEND;
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  /** column → field name (or SKIP) */
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<unknown[]>([]);
  const [parseError, setParseError] = useState("");
  const [done, setDone] = useState(false);

  // ── Resolve the item schema ────────────────────────────────────────────────

  /** Sub-schema fields if this is an ofSchema array, else [] */
  const subSchemaFields: CmsField[] = field.ofSchema
    ? (allSchemas.find((s) => s.id === field.ofSchema)?.fields ?? [])
    : [];

  /** For primitive arrays, a single pseudo-field describes the item type */
  const primitiveType = field.of ?? "text";

  const isSchemaTyped = subSchemaFields.length > 0;

  /** All target field destinations shown in the mapping dropdown */
  const destinationOptions: Array<{ value: string; label: string }> = [
    { value: SKIP, label: "— skip this column —" },
    ...(isSchemaTyped
      ? subSchemaFields.map((f) => ({ value: f.name, label: f.label }))
      : [{ value: "value", label: `Item value (${primitiveType})` }]),
  ];

  // ── Auto-mapping: match CSV column headers to field names/labels ──────────

  function autoMap(hdrs: string[]): Record<string, string> {
    const auto: Record<string, string> = {};
    hdrs.forEach((h) => {
      const norm = h.toLowerCase().replace(/[\s_-]/g, "");
      const match = destinationOptions.find(
        (opt) =>
          opt.value !== SKIP &&
          (opt.value.replace(/[\s_-]/g, "") === norm ||
            opt.label
              .toLowerCase()
              .replace(/[\s_-]/g, "")
              .includes(norm) ||
            norm.includes(opt.value.replace(/[\s_-]/g, ""))),
      );
      auto[h] = match ? match.value : SKIP;
    });
    return auto;
  }

  // ── File processing ────────────────────────────────────────────────────────

  function processFile(file: File) {
    setParseError("");
    Papa.parse<Row>(file, {
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
        setMapping(autoMap(hdrs));
        setStep(1);
      },
      error: (err) => setParseError(err.message),
    });
  }

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [field, allSchemas],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  // ── Build preview items ────────────────────────────────────────────────────

  function buildPreview() {
    const items: unknown[] = rows.map((row) => {
      if (isSchemaTyped) {
        // Build an object keyed by sub-schema field names
        const obj: Record<string, unknown> = {};
        headers.forEach((h) => {
          const dest = mapping[h];
          if (!dest || dest === SKIP) return;
          const subField = subSchemaFields.find((f) => f.name === dest);
          obj[dest] = subField
            ? coerce(row[h] ?? "", subField.type)
            : (row[h] ?? "");
        });
        return obj;
      } else {
        // Primitive: find the column mapped to "value"
        const col = headers.find((h) => mapping[h] === "value");
        const raw = col ? (row[col] ?? "") : "";
        return coerce(raw, primitiveType);
      }
    });
    setPreview(items);
    setStep(2);
  }

  // ── Commit ─────────────────────────────────────────────────────────────────

  function handleCommit() {
    if (mode === "replace") {
      onReplace(preview);
    } else {
      onAppend(preview);
    }
    setDone(true);
  }

  function reset() {
    setStep(0);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setPreview([]);
    setDone(false);
    setParseError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  const hasMappedDestination = Object.values(mapping).some((v) => v !== SKIP);

  // ── Preview helpers ────────────────────────────────────────────────────────

  /** Columns that are actually mapped (not SKIP) */
  const mappedColumns = headers.filter(
    (h) => mapping[h] && mapping[h] !== SKIP,
  );

  function cellValue(item: unknown, col: string): string {
    const dest = mapping[col];
    if (!dest || dest === SKIP) return "";
    if (isSchemaTyped) {
      const val = (item as Record<string, unknown>)[dest];
      return val == null ? "" : String(val);
    } else {
      return item == null ? "" : String(item);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <DialogTitle sx={{ pb: 1 }}>
        {mode === "replace" ? "Replace" : "Append to"} "{field.label}" from CSV
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
          {mode === "replace"
            ? "Upload a CSV file to replace the entire list with the imported rows."
            : "Upload a CSV file and map its columns to the list fields. Rows will be appended to the existing list."}
        </Typography>
      </DialogTitle>

      <DialogContent dividers sx={{ minHeight: 340 }}>
        {/* Stepper */}
        <Stepper activeStep={step} sx={{ mb: 4 }} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {parseError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {parseError}
          </Alert>
        )}

        {/* ── Step 0: Upload ─────────────────────────────────────────────── */}
        {step === 0 && (
          <Box
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            sx={{
              border: "2px dashed",
              borderColor: dragging ? "primary.main" : "grey.300",
              borderRadius: 3,
              p: { xs: 4, sm: 6 },
              textAlign: "center",
              bgcolor: dragging ? "primary.50" : "grey.50",
              transition: "all 0.15s",
              cursor: "pointer",
            }}
          >
            <UploadFileIcon
              sx={{
                fontSize: 48,
                color: dragging ? "primary.main" : "grey.400",
                mb: 1.5,
              }}
            />
            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
              {dragging ? "Drop your file here" : "Choose or drag a CSV file"}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              First row must be column headers. Each subsequent row becomes one
              list item.
            </Typography>
            <Button
              variant="contained"
              size="medium"
              component="label"
              sx={{ borderRadius: 2 }}
              onClick={(e) => e.stopPropagation()}
            >
              Browse files
              <input
                hidden
                accept=".csv,text/csv"
                type="file"
                ref={fileRef}
                onChange={handleFileInput}
              />
            </Button>
          </Box>
        )}

        {/* ── Step 1: Map columns ────────────────────────────────────────── */}
        {step === 1 && (
          <Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              Match each CSV column to a field in <strong>{field.label}</strong>
              . Columns set to "skip" are ignored.
            </Alert>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ borderRadius: 2, mb: 2 }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell sx={{ fontWeight: 700, width: "35%" }}>
                      CSV column
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, width: "38%" }}>
                      Maps to…
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      Example value
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {headers.map((h) => (
                    <TableRow key={h} hover>
                      <TableCell>
                        <Chip
                          label={h}
                          size="small"
                          variant="outlined"
                          sx={{ fontFamily: "monospace", fontSize: "0.75rem" }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          fullWidth
                          value={mapping[h] ?? SKIP}
                          onChange={(e) =>
                            setMapping((prev) => ({
                              ...prev,
                              [h]: e.target.value,
                            }))
                          }
                        >
                          {destinationOptions.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "text.secondary",
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontSize: "0.8rem",
                        }}
                      >
                        {rows[0]?.[h] !== undefined && rows[0][h] !== "" ? (
                          rows[0][h]
                        ) : (
                          <em style={{ opacity: 0.4 }}>empty</em>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography variant="body2" color="text.secondary">
              {rows.length} row{rows.length !== 1 ? "s" : ""} found in your
              file.
            </Typography>
          </Box>
        )}

        {/* ── Step 2: Preview ────────────────────────────────────────────── */}
        {step === 2 && !done && (
          <Box>
            <Alert
              severity={mode === "replace" ? "warning" : "success"}
              sx={{ mb: 2 }}
            >
              <strong>
                {preview.length} item{preview.length !== 1 ? "s" : ""}
              </strong>{" "}
              {mode === "replace" ? (
                <>
                  ready to <strong>replace</strong> the entire{" "}
                  <strong>{field.label}</strong> list.
                </>
              ) : (
                <>
                  ready to append to <strong>{field.label}</strong>.
                </>
              )}
            </Alert>

            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ borderRadius: 2, mb: 2, maxHeight: 320, overflow: "auto" }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={{ bgcolor: "grey.50" }}>
                    <TableCell sx={{ fontWeight: 700, width: 40 }}>#</TableCell>
                    {mappedColumns.map((col) => {
                      const dest = mapping[col];
                      const label =
                        destinationOptions.find((o) => o.value === dest)
                          ?.label ?? dest;
                      return (
                        <TableCell key={col} sx={{ fontWeight: 700 }}>
                          {label}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.map((item, idx) => (
                    <TableRow key={idx} hover>
                      <TableCell sx={{ color: "text.secondary" }}>
                        {idx + 1}
                      </TableCell>
                      {mappedColumns.map((col) => (
                        <TableCell
                          key={col}
                          sx={{
                            maxWidth: 200,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {cellValue(item, col) || (
                            <em style={{ opacity: 0.35 }}>—</em>
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* ── Done ──────────────────────────────────────────────────────── */}
        {done && (
          <Box sx={{ textAlign: "center", py: 5 }}>
            <CheckCircleIcon
              sx={{ fontSize: 56, color: "success.main", mb: 1.5 }}
            />
            <Typography variant="h6" fontWeight={700} gutterBottom>
              {preview.length} item{preview.length !== 1 ? "s" : ""}{" "}
              {mode === "replace" ? "imported!" : "appended!"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The list has been updated. You can import another file or close
              this dialog.
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        {done ? (
          <>
            <Button onClick={reset} variant="outlined" size="small">
              Import another
            </Button>
            <Button onClick={onClose} variant="contained" size="small">
              Close
            </Button>
          </>
        ) : (
          <>
            <Button onClick={onClose} size="small">
              Cancel
            </Button>
            {step > 0 && !done && (
              <Button
                onClick={() => setStep((s) => s - 1)}
                variant="outlined"
                size="small"
              >
                ← Back
              </Button>
            )}
            {step === 1 && (
              <Button
                variant="contained"
                size="small"
                disabled={!hasMappedDestination}
                onClick={buildPreview}
              >
                Preview →
              </Button>
            )}
            {step === 2 && (
              <Button
                variant="contained"
                size="small"
                color={mode === "replace" ? "warning" : "success"}
                onClick={handleCommit}
              >
                {mode === "replace" ? "Replace list" : "Append"}{" "}
                {preview.length} item{preview.length !== 1 ? "s" : ""}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </>
  );
}
