/**
 * AdminApp.tsx
 * Root of the CMS admin interface.
 * Protected by Auth0 — on login, a GitHub token is retrieved via useGitHubToken.
 * Navigation: Content (file browser + editor) | CSV Importer
 */
import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import ArticleIcon from "@mui/icons-material/Article";
import TableChartIcon from "@mui/icons-material/TableChart";
import { useState } from "react";

import { useGitHubToken } from "./useGitHubToken";
import { ContentList } from "./pages/ContentList";
import { ContentFileEditor } from "./editor/ContentFileEditor";
import { CsvImporter } from "./csv/CsvImporter";

const DRAWER_WIDTH = 220;

type Section = "Content" | "CSV Importer";

const navItems: { label: Section; icon: React.ReactNode }[] = [
  { label: "Content", icon: <ArticleIcon /> },
  { label: "CSV Importer", icon: <TableChartIcon /> },
];

const cmsTheme = createTheme({
  palette: { primary: { main: "#1565c0" } },
  typography: { fontFamily: "Roboto, sans-serif" },
});

// ─── Dashboard ──────────────────────────────────────────────────────────────

function AdminDashboard() {
  const { user, logout } = useAuth0();
  const token = useGitHubToken();

  const [activeSection, setActiveSection] = useState<Section>("Content");
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
    if (activeSection === "Content") {
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

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* App bar */}
      <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flex: 1, fontWeight: 700 }}>
            CMS Admin
          </Typography>
          {user && (
            <Typography variant="body2" sx={{ mr: 2, opacity: 0.85 }}>
              {user.email}
            </Typography>
          )}
          <Button
            color="inherit"
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
          >
            Log out
          </Button>
        </Toolbar>
      </AppBar>

      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: "auto", mt: 1 }}>
          <List dense>
            {navItems.map(({ label, icon }) => (
              <ListItemButton
                key={label}
                selected={activeSection === label}
                onClick={() => {
                  setActiveSection(label);
                  setEditingFile(null);
                }}
                sx={{ borderRadius: 1, mx: 1, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>{icon}</ListItemIcon>
                <ListItemText primary={label} />
              </ListItemButton>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main content */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Toolbar />
        <Box sx={{ flex: 1, overflow: "auto" }}>{renderMain()}</Box>
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
