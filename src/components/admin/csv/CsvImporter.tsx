/**
 * CsvImporter — bulk create pages from a spreadsheet.
 * Non-technical UX: drag-drop upload, friendly step labels, plain English copy.
 */
import { useCallback, useRef, useState } from "react";
import Papa from "papaparse";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
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
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { commitFiles } from "../../../../cms/github/github";
import type { ContentPage } from "../../../../cms/types";

const REPO = import.meta.env.PUBLIC_GITHUB_REPO as string;
const BRANCH = import.meta.env.PUBLIC_GITHUB_BRANCH as string;

type Row = Record<string, string>;

const PAGE_FIELDS = [
  { value: "", label: "— skip this column —" },
  { value: "slug", label: "URL Slug  (required) — e.g. about-us" },
  { value: "title", label: "Page Title — e.g. About Us" },
  { value: "description", label: "Short Description (for search engines)" },
  { value: "body", label: "Page Content / Body (HTML)" },
];

function buildPage(
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
    description: get("description"),
    body: get("body"),
  };
}

const STEPS = ["Upload file", "Match columns", "Review & publish"];

interface Props {
  token: string | null;
}

export function CsvImporter({ token }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<ContentPage[]>([]);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [parseError, setParseError] = useState("");
  const [commitError, setCommitError] = useState("");

  function reset() {
    setStep(0);
    setHeaders([]);
    setRows([]);
    setMapping({});
    setPreview([]);
    setDone(false);
    setParseError("");
    setCommitError("");
    if (fileRef.current) fileRef.current.value = "";
  }

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
        const auto: Record<string, string> = {};
        hdrs.forEach((h) => {
          const lower = h.toLowerCase().replace(/[\s_]/g, "");
          const match = PAGE_FIELDS.find(
            (f) => f.value && lower.includes(f.value.replace("-", "")),
          );
          if (match) auto[h] = match.value;
        });
        setMapping(auto);
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
    [],
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }

  function buildPreview() {
    setPreview(
      rows.map((r) => buildPage(mapping, r)).filter(Boolean) as ContentPage[],
    );
    setStep(2);
  }

  async function handlePublish() {
    if (!token) return;
    setSaving(true);
    setCommitError("");
    try {
      await commitFiles(
        token,
        REPO,
        BRANCH,
        preview.map((p) => ({
          path: `src/content/pages/${p.slug}.json`,
          content: JSON.stringify(p, null, 2),
          message: `content: import "${p.slug}" from CSV`,
        })),
      );
      setDone(true);
      setStep(3);
    } catch (err) {
      setCommitError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const slugReady = Object.values(mapping).includes("slug");

  return (
    <Box sx={{ p: { xs: 2, sm: 4 }, maxWidth: 860, mx: "auto" }}>
      {/* Header */}
      <Box
        sx={{
          mb: 4,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Import from Spreadsheet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
            Upload a CSV file to create multiple pages at once.
          </Typography>
        </Box>
        {step > 0 && (
          <Button size="small" variant="outlined" onClick={reset}>
            Start over
          </Button>
        )}
      </Box>

      {/* Steps */}
      <Stepper activeStep={step} sx={{ mb: 5 }} alternativeLabel>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {!token && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          You need to be logged in to publish pages.
        </Alert>
      )}
      {parseError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {parseError}
        </Alert>
      )}
      {commitError && (
        <Alert
          severity="error"
          onClose={() => setCommitError("")}
          sx={{ mb: 3 }}
        >
          {commitError}
        </Alert>
      )}

      {/* ── Step 0: Upload ── */}
      {step === 0 && (
        <Box
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          sx={{
            border: "2px dashed",
            borderColor: dragging ? "primary.main" : "grey.300",
            borderRadius: 4,
            p: { xs: 4, sm: 8 },
            textAlign: "center",
            bgcolor: dragging ? "primary.50" : "#fff",
            transition: "all 0.15s",
            cursor: "pointer",
          }}
          onClick={() => fileRef.current?.click()}
        >
          <UploadFileIcon
            sx={{
              fontSize: 56,
              color: dragging ? "primary.main" : "grey.400",
              mb: 2,
            }}
          />
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {dragging ? "Drop your file here" : "Choose or drag a CSV file"}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Export your spreadsheet as .csv format. The first row must be column
            headers.
          </Typography>
          <Button
            variant="contained"
            size="large"
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

      {/* ── Step 1: Map columns ── */}
      {step === 1 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            Tell us what each column in your spreadsheet means. The{" "}
            <strong>URL Slug</strong> column is required.
          </Alert>
          <Paper
            variant="outlined"
            sx={{ borderRadius: 3, overflow: "hidden", mb: 3 }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 700, width: "35%" }}>
                    Your column
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700, width: "40%" }}>
                    Means…
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Example value</TableCell>
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
                        sx={{ fontFamily: "monospace" }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        select
                        size="small"
                        fullWidth
                        value={mapping[h] ?? ""}
                        onChange={(e) =>
                          setMapping((prev) => ({
                            ...prev,
                            [h]: e.target.value,
                          }))
                        }
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
                        maxWidth: 180,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {rows[0]?.[h] ?? <em style={{ opacity: 0.4 }}>empty</em>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {rows.length} row{rows.length !== 1 ? "s" : ""} found in your file.
          </Typography>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" onClick={() => setStep(0)}>
              ← Back
            </Button>
            <Tooltip
              title={
                !slugReady ? "You must map at least one column to URL Slug" : ""
              }
            >
              <span>
                <Button
                  variant="contained"
                  disabled={!slugReady}
                  onClick={buildPreview}
                >
                  Review pages →
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      )}

      {/* ── Step 2: Preview ── */}
      {step === 2 && !done && (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>
            <strong>
              {preview.length} page{preview.length !== 1 ? "s" : ""}
            </strong>{" "}
            ready to publish. Review below, then click Publish.
          </Alert>
          <Paper
            variant="outlined"
            sx={{ borderRadius: 3, overflow: "hidden", mb: 3 }}
          >
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 700 }}>Page title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>URL</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {preview.map((p) => (
                  <TableRow key={p.slug} hover>
                    <TableCell>{p.title}</TableCell>
                    <TableCell>
                      <Chip
                        label={`/${p.slug}`}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell
                      sx={{
                        color: "text.secondary",
                        maxWidth: 260,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {(p.description as string) || (
                        <em style={{ opacity: 0.4 }}>No description</em>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Paper>
          <Stack direction="row" spacing={1.5}>
            <Button variant="outlined" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Tooltip
              title={
                !token
                  ? "Log in first"
                  : `Publishes ${preview.length} pages to ${BRANCH}`
              }
            >
              <span>
                <Button
                  variant="contained"
                  size="large"
                  disabled={saving || !token}
                  onClick={handlePublish}
                  startIcon={
                    saving ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <CloudUploadIcon />
                    )
                  }
                  sx={{ borderRadius: 2 }}
                >
                  {saving
                    ? "Publishing…"
                    : `Publish ${preview.length} page${preview.length !== 1 ? "s" : ""}`}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        </Box>
      )}

      {/* ── Step 3: Done ── */}
      {done && (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <CheckCircleIcon
            sx={{ fontSize: 72, color: "success.main", mb: 2 }}
          />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            All done!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
            {preview.length} page{preview.length !== 1 ? "s were" : " was"}{" "}
            published to <strong>{BRANCH}</strong>. Trigger a deploy to make
            them live on your site.
          </Typography>
          <Button
            variant="outlined"
            size="large"
            onClick={reset}
            sx={{ borderRadius: 2 }}
          >
            Import another file
          </Button>
        </Box>
      )}
    </Box>
  );
}
