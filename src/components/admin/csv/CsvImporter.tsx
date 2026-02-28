/**
 * CsvImporter.tsx
 * Upload a CSV → preview table → map columns to page fields → bulk-commit JSON pages to GitHub.
 */
import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import Step from "@mui/material/Step";
import StepLabel from "@mui/material/StepLabel";
import Stepper from "@mui/material/Stepper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import { commitFiles } from "../../../../cms/github/github";
import type { ContentPage } from "../../../../cms/types";

const REPO = import.meta.env.PUBLIC_GITHUB_REPO as string;
const BRANCH = import.meta.env.PUBLIC_GITHUB_BRANCH as string;

type Row = Record<string, string>;

// Fields the user can map CSV columns onto
const PAGE_FIELDS = [
  { value: "", label: "— ignore —" },
  { value: "slug", label: "Slug (URL key) *" },
  { value: "title", label: "Page Title" },
  { value: "description", label: "Description / Meta" },
  { value: "body", label: "Body (HTML)" },
];

function buildPageJson(
  mapping: Record<string, string>,
  row: Row,
): ContentPage | null {
  const get = (field: string) => {
    const col = Object.keys(mapping).find((k) => mapping[k] === field);
    return col ? (row[col] ?? "") : "";
  };
  const slug = get("slug")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  if (!slug) return null;

  return {
    slug,
    title: get("title") || slug,
    description: get("description") || "",
    body: get("body") || "",
  };
}

// ─── Stepper steps ────────────────────────────────────────────────────────

interface Props {
  token: string | null;
}

export function CsvImporter({ token }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ContentPage[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [snack, setSnack] = useState("");
  const [parseError, setParseError] = useState("");

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

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
        // Attempt auto-mapping by lower-case header match
        const auto: Record<string, string> = {};
        hdrs.forEach((h) => {
          const lower = h.toLowerCase();
          const match = PAGE_FIELDS.find(
            (f) => f.value && lower.includes(f.value.toLowerCase()),
          );
          if (match) auto[h] = match.value;
        });
        setMapping(auto);
        setStep(1);
      },
      error: (err) => setParseError(err.message),
    });
  }, []);

  function buildPreview() {
    const pages = rows
      .map((row) => buildPageJson(mapping, row))
      .filter(Boolean) as ContentPage[];
    setPreview(pages);
    setStep(2);
  }

  async function handleCommit() {
    if (!token) return;
    setSaving(true);
    try {
      const files = preview.map((page) => ({
        path: `src/content/pages/${page.slug}.json`,
        content: JSON.stringify(page, null, 2),
        message: `content: import page "${page.slug}" from CSV`,
      }));
      await commitFiles(token, REPO, BRANCH, files);
      setSaving(false);
      setDone(true);
      setStep(3);
    } catch (err) {
      setSnack(`Error: ${(err as Error).message}`);
      setSaving(false);
    }
  }

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Toolbar variant="dense">
          <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
            CSV Importer
          </Typography>
          {step > 0 && (
            <Button size="small" onClick={reset}>
              Start Over
            </Button>
          )}
        </Toolbar>
      </Box>

      <Box sx={{ flex: 1, overflowY: "auto", p: 3 }}>
        <Stepper activeStep={step} sx={{ mb: 4 }}>
          {["Upload CSV", "Map Columns", "Preview", "Done"].map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {!token && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Log in to commit pages.
          </Alert>
        )}
        {parseError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {parseError}
          </Alert>
        )}

        {/* Step 0 — Upload */}
        {step === 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              mt: 4,
            }}
          >
            <UploadFileIcon sx={{ fontSize: 64, color: "primary.main" }} />
            <Typography variant="h6">Upload a CSV file</Typography>
            <Typography variant="body2" color="text.secondary">
              First row must contain column headers.
            </Typography>
            <Button variant="contained" component="label">
              Choose File
              <input
                hidden
                accept=".csv,text/csv"
                type="file"
                ref={fileRef}
                onChange={handleFile}
              />
            </Button>
          </Box>
        )}

        {/* Step 1 — Map columns */}
        {step === 1 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Map CSV columns to page fields. At least "Slug" is required.
            </Typography>
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ mb: 2, maxHeight: 300 }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>CSV Column</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Map to Field</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Sample Value</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {headers.map((h) => (
                    <TableRow key={h}>
                      <TableCell>
                        <code>{h}</code>
                      </TableCell>
                      <TableCell>
                        <TextField
                          select
                          size="small"
                          value={mapping[h] ?? ""}
                          onChange={(e) =>
                            setMapping((prev) => ({
                              ...prev,
                              [h]: e.target.value,
                            }))
                          }
                          sx={{ minWidth: 200 }}
                        >
                          {PAGE_FIELDS.map((f) => (
                            <MenuItem key={f.value} value={f.value}>
                              {f.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </TableCell>
                      <TableCell
                        sx={{
                          color: "text.secondary",
                          maxWidth: 200,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {rows[0]?.[h] ?? ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {rows.length} row{rows.length !== 1 ? "s" : ""} detected.
            </Typography>
            <Button
              variant="contained"
              disabled={!Object.values(mapping).includes("slug")}
              onClick={buildPreview}
            >
              Preview Pages →
            </Button>
          </Box>
        )}

        {/* Step 2 — Preview */}
        {step === 2 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              {preview.length} page{preview.length !== 1 ? "s" : ""} will be
              created:
            </Typography>
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{ mb: 2, maxHeight: 400 }}
            >
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Path</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {preview.map((p) => (
                    <TableRow key={p.slug}>
                      <TableCell>
                        <code>src/content/pages/{p.slug}.json</code>
                      </TableCell>
                      <TableCell>{p.title}</TableCell>
                      <TableCell>{(p.description as string) ?? ""}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" onClick={() => setStep(1)}>
                ← Back
              </Button>
              <Tooltip
                title={
                  !token
                    ? "Log in first"
                    : `Commit ${preview.length} files to ${BRANCH}`
                }
              >
                <span>
                  <Button
                    variant="contained"
                    disabled={saving || !token}
                    onClick={handleCommit}
                    startIcon={
                      saving ? (
                        <CircularProgress size={14} color="inherit" />
                      ) : undefined
                    }
                  >
                    Commit {preview.length} Files
                  </Button>
                </span>
              </Tooltip>
            </Stack>
          </Box>
        )}

        {/* Step 3 — Done */}
        {done && step === 3 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              mt: 4,
            }}
          >
            <CheckCircleIcon sx={{ fontSize: 64, color: "success.main" }} />
            <Typography variant="h6">Import complete!</Typography>
            <Typography variant="body2" color="text.secondary">
              {preview.length} page{preview.length !== 1 ? "s were" : " was"}{" "}
              committed to <strong>{BRANCH}</strong>. Trigger a deploy to
              publish them.
            </Typography>
            <Button variant="outlined" onClick={reset}>
              Import Another CSV
            </Button>
          </Box>
        )}
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={5000}
        onClose={() => setSnack("")}
        message={snack}
      />
    </Box>
  );
}
