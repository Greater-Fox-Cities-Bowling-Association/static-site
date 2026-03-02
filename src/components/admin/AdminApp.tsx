import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import ArticleIcon from "@mui/icons-material/Article";
import TableChartIcon from "@mui/icons-material/TableChart";
import LogoutIcon from "@mui/icons-material/Logout";
import { useState } from "react";

import { useGitHubToken } from "./useGitHubToken";
import { ContentList } from "./pages/ContentList";
import { ContentFileEditor } from "./editor/ContentFileEditor";
import { CsvImporter } from "./csv/CsvImporter";

const DRAWER_WIDTH = 260;

type Section = "Pages" | "CSV Import";

const navItems: {
  label: Section;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    label: "Pages",
    icon: <ArticleIcon />,
    description: "Edit your website pages",
  },
  {
    label: "CSV Import",
    icon: <TableChartIcon />,
    description: "Bulk import from a spreadsheet",
  },
];

const cmsTheme = createTheme({
  palette: {
    primary: { main: "#2563eb" },
    background: { default: "#f1f5f9" },
  },
  shape: { borderRadius: 10 },
  typography: { fontFamily: "Roboto, sans-serif" },
  components: {
    MuiButton: {
      styleOverrides: { root: { textTransform: "none", fontWeight: 600 } },
    },
  },
});

// ─── Dashboard ──────────────────────────────────────────────────────────────

function AdminDashboard() {
  const { user, logout } = useAuth0();
  const token = useGitHubToken();

  const [activeSection, setActiveSection] = useState<Section>("Pages");
  const [editingFile, setEditingFile] = useState<{
    path: string;
    content: string;
  } | null>(null);

  function handleEditFile(path: string, content: string) {
    setEditingFile({ path, content });
  }

  function handleCloseEditor() {
    setEditingFile(null);
  }

  function renderMain() {
    if (activeSection === "Pages") {
      if (editingFile) {
        return (
          <ContentFileEditor
            filePath={editingFile.path}
            initialContent={editingFile.content}
            token={token}
            onBack={handleCloseEditor}
          />
        );
      }
      return <ContentList token={token} onEditFile={handleEditFile} />;
    }
    return <CsvImporter token={token} />;
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : (user?.email?.[0] ?? "?").toUpperCase();

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* ── Dark sidebar ── */}
      <Box
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          bgcolor: "#0f172a",
          color: "#f1f5f9",
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Brand */}
        <Box
          sx={{
            px: 3,
            py: 3,
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: "#fff", lineHeight: 1.2 }}
          >
            Website Admin
          </Typography>
          <Typography variant="caption" sx={{ color: "#94a3b8" }}>
            Content Manager
          </Typography>
        </Box>

        {/* Nav */}
        <List sx={{ px: 1.5, pt: 1.5, flex: 1 }}>
          {navItems.map(({ label, icon, description }) => {
            const selected = activeSection === label;
            return (
              <ListItemButton
                key={label}
                selected={selected}
                onClick={() => {
                  setActiveSection(label);
                  setEditingFile(null);
                }}
                sx={{
                  borderRadius: 2,
                  mb: 0.5,
                  py: 1.2,
                  "&.Mui-selected": {
                    bgcolor: "rgba(37,99,235,0.85)",
                    "&:hover": { bgcolor: "rgba(37,99,235,0.95)" },
                  },
                  "&:hover": { bgcolor: "rgba(255,255,255,0.07)" },
                  color: selected ? "#fff" : "#cbd5e1",
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 38,
                    color: "inherit",
                    opacity: selected ? 1 : 0.7,
                  }}
                >
                  {icon}
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  secondary={description}
                  primaryTypographyProps={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "inherit",
                  }}
                  secondaryTypographyProps={{
                    fontSize: 11,
                    color: selected ? "rgba(255,255,255,0.7)" : "#64748b",
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>

        <Divider sx={{ borderColor: "rgba(255,255,255,0.08)" }} />

        {/* User footer */}
        <Box
          sx={{ px: 2, py: 2, display: "flex", alignItems: "center", gap: 1.5 }}
        >
          <Avatar
            sx={{
              width: 34,
              height: 34,
              bgcolor: "#2563eb",
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            {initials}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "#e2e8f0",
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {user?.name ?? user?.email ?? "User"}
            </Typography>
            <Typography
              variant="caption"
              sx={{ color: "#64748b", fontSize: 10 }}
            >
              Logged in
            </Typography>
          </Box>
          <Button
            size="small"
            onClick={() =>
              logout({
                logoutParams: {
                  returnTo:
                    (import.meta.env.PUBLIC_AUTH0_LOGOUT_URI as string) ||
                    window.location.origin,
                },
              })
            }
            sx={{
              minWidth: 0,
              p: 0.75,
              color: "#64748b",
              "&:hover": { color: "#f1f5f9" },
            }}
            title="Log out"
          >
            <LogoutIcon fontSize="small" />
          </Button>
        </Box>
      </Box>

      {/* ── Main content ── */}
      <Box
        component="main"
        sx={{
          ml: `${DRAWER_WIDTH}px`,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
          bgcolor: "#f1f5f9",
          overflow: "auto",
        }}
      >
        {renderMain()}
      </Box>
    </Box>
  );
}

// ─── Auth gate ───────────────────────────────────────────────────────────────

function AuthGate() {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();

  if (isLoading || !isAuthenticated) {
    if (!isLoading) loginWithRedirect();
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return <AdminDashboard />;
}

// ─── Root export ─────────────────────────────────────────────────────────────

export default function AdminApp() {
  const domain = import.meta.env.PUBLIC_AUTH0_DOMAIN as string;
  const clientId = import.meta.env.PUBLIC_AUTH0_CLIENT_ID as string;
  const redirectUri =
    (import.meta.env.PUBLIC_AUTH0_REDIRECT_URI as string) ??
    window.location.origin;

  if (!domain || !clientId) {
    return (
      <ThemeProvider theme={cmsTheme}>
        <CssBaseline />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Typography variant="h5">Admin not configured</Typography>
          <Typography variant="body2" color="text.secondary">
            Set PUBLIC_AUTH0_DOMAIN and PUBLIC_AUTH0_CLIENT_ID in
            .env.development.
          </Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{ redirect_uri: redirectUri }}
    >
      <ThemeProvider theme={cmsTheme}>
        <CssBaseline />
        <AuthGate />
      </ThemeProvider>
    </Auth0Provider>
  );
}
