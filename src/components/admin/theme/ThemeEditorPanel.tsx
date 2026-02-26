/**
 * ThemeEditorPanel.tsx
 * Visual editor for src/theme.json — color pickers, sliders, font chooser.
 * Live preview updates as you edit. Save commits to GitHub.
 */
import { useEffect, useState } from "react";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Snackbar from "@mui/material/Snackbar";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SaveIcon from "@mui/icons-material/Save";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import MuiButton from "@mui/material/Button";

import { commitFiles } from "../../../../cms/github/github";
import { fetchFileContent } from "../../../../cms/github/githubContent";
import defaultTokens from "../../../theme.json";

type ThemeTokens = typeof defaultTokens;

const REPO = import.meta.env.PUBLIC_GITHUB_REPO as string;
const BRANCH = import.meta.env.PUBLIC_GITHUB_BRANCH as string;

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
      <Box
        component="input"
        type="color"
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        style={{
          width: 36,
          height: 28,
          border: "none",
          padding: 0,
          cursor: "pointer",
          borderRadius: 4,
        }}
      />
      <Typography variant="body2" sx={{ flex: 1 }}>
        {label}
      </Typography>
      <TextField
        size="small"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        sx={{ width: 110 }}
        inputProps={{ style: { fontSize: 12, fontFamily: "monospace" } }}
      />
    </Box>
  );
}

// ─── Live Preview ─────────────────────────────────────────────────────────

function ThemePreview({ tokens }: { tokens: ThemeTokens }) {
  const theme = createTheme({
    palette: {
      primary: {
        main: tokens.palette.primary.main,
        light: tokens.palette.primary.light,
        dark: tokens.palette.primary.dark,
      },
      secondary: { main: tokens.palette.secondary.main },
      background: {
        default: tokens.palette.background.default,
        paper: tokens.palette.background.paper,
      },
    },
    typography: { fontFamily: tokens.typography.fontFamily },
    spacing: tokens.spacing,
    shape: { borderRadius: tokens.shape.borderRadius.md },
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 2, bgcolor: "background.default" }}>
        <Typography variant="h4" gutterBottom>
          Heading h4
        </Typography>
        <Typography variant="body1" gutterBottom>
          Body text — lorem ipsum dolor sit amet.
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <MuiButton variant="contained">Contained</MuiButton>
          <MuiButton variant="outlined">Outlined</MuiButton>
          <MuiButton variant="text">Text</MuiButton>
        </Stack>
        <Card>
          <CardContent>
            <Typography variant="h6">Card title</Typography>
            <Typography variant="body2" color="text.secondary">
              Card body text preview.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────

interface Props {
  token: string | null;
}

export function ThemeEditorPanel({ token }: Props) {
  const [tokens, setTokens] = useState<ThemeTokens>(defaultTokens);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState("");
  const [isDirty, setIsDirty] = useState(false);

  function patch(path: string[], value: unknown) {
    setTokens((prev) => {
      const next = JSON.parse(JSON.stringify(prev)) as ThemeTokens;
      let obj: Record<string, unknown> = next as unknown as Record<
        string,
        unknown
      >;
      for (let i = 0; i < path.length - 1; i++)
        obj = obj[path[i]] as Record<string, unknown>;
      obj[path[path.length - 1]] = value;
      return next;
    });
    setIsDirty(true);
  }

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchFileContent(token, REPO, BRANCH, "src/theme.json")
      .then((raw) => setTokens(JSON.parse(raw) as ThemeTokens))
      .catch(() => {
        /* use default */
      })
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave() {
    if (!token) return;
    setSaving(true);
    try {
      await commitFiles(token, REPO, BRANCH, [
        {
          path: "src/theme.json",
          content: JSON.stringify(tokens, null, 2),
          message: "theme: update theme tokens",
        },
      ]);
      setSnack("Theme saved! Publish to deploy.");
      setIsDirty(false);
    } catch (err) {
      setSnack(`Error: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading)
    return (
      <Box sx={{ display: "flex", p: 4 }}>
        <CircularProgress />
      </Box>
    );

  return (
    <Box sx={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* Controls */}
      <Box
        sx={{
          width: 360,
          flexShrink: 0,
          overflowY: "auto",
          borderRight: 1,
          borderColor: "divider",
        }}
      >
        <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
          <Toolbar variant="dense">
            <Typography variant="subtitle1" sx={{ flex: 1, fontWeight: 600 }}>
              Theme Editor
            </Typography>
            <Button
              size="small"
              variant="contained"
              startIcon={
                saving ? (
                  <CircularProgress size={14} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
              disabled={saving || !isDirty || !token}
              onClick={handleSave}
            >
              Save
            </Button>
          </Toolbar>
        </Box>

        {!token && (
          <Alert severity="warning" sx={{ m: 2 }}>
            Log in to save changes.
          </Alert>
        )}

        <Box sx={{ p: 2 }}>
          {/* Primary color */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Primary Color</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ColorRow
                label="Main"
                value={tokens.palette.primary.main}
                onChange={(v) => patch(["palette", "primary", "main"], v)}
              />
              <ColorRow
                label="Light"
                value={tokens.palette.primary.light}
                onChange={(v) => patch(["palette", "primary", "light"], v)}
              />
              <ColorRow
                label="Dark"
                value={tokens.palette.primary.dark}
                onChange={(v) => patch(["palette", "primary", "dark"], v)}
              />
              <ColorRow
                label="Contrast Text"
                value={tokens.palette.primary.contrastText}
                onChange={(v) =>
                  patch(["palette", "primary", "contrastText"], v)
                }
              />
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Secondary Color</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ColorRow
                label="Main"
                value={tokens.palette.secondary.main}
                onChange={(v) => patch(["palette", "secondary", "main"], v)}
              />
              <ColorRow
                label="Light"
                value={tokens.palette.secondary.light}
                onChange={(v) => patch(["palette", "secondary", "light"], v)}
              />
              <ColorRow
                label="Dark"
                value={tokens.palette.secondary.dark}
                onChange={(v) => patch(["palette", "secondary", "dark"], v)}
              />
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Background</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <ColorRow
                label="Default"
                value={tokens.palette.background.default}
                onChange={(v) => patch(["palette", "background", "default"], v)}
              />
              <ColorRow
                label="Paper"
                value={tokens.palette.background.paper}
                onChange={(v) => patch(["palette", "background", "paper"], v)}
              />
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Typography</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <TextField
                select
                size="small"
                label="Font Family"
                fullWidth
                value={tokens.typography.fontFamily}
                onChange={(e) =>
                  patch(["typography", "fontFamily"], e.target.value)
                }
                sx={{ mb: 1.5 }}
              >
                {[
                  '"Roboto", "Helvetica", "Arial", sans-serif',
                  '"Inter", "Helvetica", "Arial", sans-serif',
                  '"Open Sans", "Helvetica", "Arial", sans-serif',
                  '"Lato", "Helvetica", "Arial", sans-serif',
                  'Georgia, "Times New Roman", serif',
                ].map((f) => (
                  <MenuItem key={f} value={f}>
                    {f.split(",")[0].replace(/"/g, "")}
                  </MenuItem>
                ))}
              </TextField>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Spacing</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Slider
                  min={4}
                  max={16}
                  step={1}
                  value={tokens.spacing}
                  onChange={(_, v) => patch(["spacing"], v)}
                  sx={{ flex: 1 }}
                />
                <Typography variant="body2">{tokens.spacing}px</Typography>
              </Box>
            </AccordionDetails>
          </Accordion>

          <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle2">Border Radius</Typography>
            </AccordionSummary>
            <AccordionDetails>
              {Object.entries(tokens.shape.borderRadius).map(([key, val]) => (
                <Box
                  key={key}
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
                >
                  <Typography variant="body2" sx={{ width: 40 }}>
                    {key}
                  </Typography>
                  <Slider
                    min={0}
                    max={32}
                    step={1}
                    value={val as number}
                    onChange={(_, v) =>
                      patch(["shape", "borderRadius", key], v)
                    }
                    sx={{ flex: 1 }}
                  />
                  <Typography variant="body2" sx={{ width: 32 }}>
                    {val}px
                  </Typography>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>
        </Box>
      </Box>

      {/* Live preview */}
      <Box sx={{ flex: 1, overflowY: "auto", bgcolor: "#f0f0f0", p: 2 }}>
        <Typography variant="overline" sx={{ px: 1 }}>
          Live Preview
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <ThemePreview tokens={tokens} />
      </Box>

      <Snackbar
        open={!!snack}
        autoHideDuration={4000}
        onClose={() => setSnack("")}
        message={snack}
      />
    </Box>
  );
}
