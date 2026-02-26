import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import EditIcon from "@mui/icons-material/Edit";
import ExtensionIcon from "@mui/icons-material/Extension";
import PaletteIcon from "@mui/icons-material/Palette";
import TableChartIcon from "@mui/icons-material/TableChart";
import { useState } from "react";

const DRAWER_WIDTH = 240;

const navItems = [
  { label: "Visual Editor", icon: <EditIcon /> },
  { label: "Components", icon: <ExtensionIcon /> },
  { label: "Theme", icon: <PaletteIcon /> },
  { label: "CSV Importer", icon: <TableChartIcon /> },
];

function AdminDashboard() {
  const { user, logout } = useAuth0();
  const [activeSection, setActiveSection] = useState("Visual Editor");

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Site Admin
          </Typography>
          <Typography variant="body2" sx={{ mr: 2 }}>
            {user?.email}
          </Typography>
          <Button
            color="inherit"
            onClick={() =>
              logout({
                logoutParams: {
                  returnTo:
                    import.meta.env.PUBLIC_AUTH0_LOGOUT_URI ||
                    window.location.origin,
                },
              })
            }
          >
            Log Out
          </Button>
        </Toolbar>
      </AppBar>

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
          <List>
            {navItems.map((item) => (
              <ListItemButton
                key={item.label}
                selected={activeSection === item.label}
                onClick={() => setActiveSection(item.label)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
          <Divider />
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Typography variant="h5" gutterBottom>
          {activeSection}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {activeSection} — implementation coming in Phase 2.
        </Typography>
      </Box>
    </Box>
  );
}

function AdminRoot() {
  const { isLoading, isAuthenticated, loginWithRedirect } = useAuth0();

  if (isLoading) {
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

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          gap: 2,
        }}
      >
        <Typography variant="h4">Site Admin</Typography>
        <Typography variant="body1" color="text.secondary">
          Sign in to manage your site.
        </Typography>
        <Button
          variant="contained"
          size="large"
          onClick={() => loginWithRedirect()}
        >
          Log In
        </Button>
      </Box>
    );
  }

  return <AdminDashboard />;
}

const muiTheme = createTheme();

export default function AdminApp() {
  const domain = import.meta.env.PUBLIC_AUTH0_DOMAIN;
  const clientId = import.meta.env.PUBLIC_AUTH0_CLIENT_ID;
  const redirectUri =
    import.meta.env.PUBLIC_AUTH0_REDIRECT_URI ?? window.location.origin;

  if (!domain || !clientId) {
    return (
      <ThemeProvider theme={muiTheme}>
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
            .env.development to continue.
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
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        <AdminRoot />
      </ThemeProvider>
    </Auth0Provider>
  );
}
