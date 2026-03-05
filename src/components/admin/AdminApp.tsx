import { Auth0Provider, useAuth0 } from "@auth0/auth0-react";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Skeleton from "@mui/material/Skeleton";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import ArticleIcon from "@mui/icons-material/Article";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import LogoutIcon from "@mui/icons-material/Logout";
import SchemaIcon from "@mui/icons-material/Schema";
import { useEffect, useState } from "react";

import { useGitHubToken } from "./useGitHubToken";
import { ContentList } from "./pages/ContentList";
import { ContentFileEditor } from "./editor/ContentFileEditor";
import { GroupManager } from "./schema/GroupManager";
import { SchemaList } from "./schema/SchemaList";
import { listSchemas } from "../../../cms/github/githubSchemas";
import type { CmsSchema } from "../../../cms/types";

const REPO = import.meta.env.PUBLIC_GITHUB_REPO as string;
const BRANCH = import.meta.env.PUBLIC_GITHUB_BRANCH as string;

const DRAWER_WIDTH = 268;

// Section key format:
//   "schema:<id>"    → content list for that schema
//   "content-models" → schema builder UI
//   "groups"         → drag-and-drop group organizer

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

  const [schemas, setSchemas] = useState<CmsSchema[]>([]);
  const [schemasLoading, setSchemasLoading] = useState(false);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  const [activeSection, setActiveSection] = useState<string>("content-models");
  const [editingFile, setEditingFile] = useState<{
    path: string;
    content: string;
    schema?: CmsSchema;
  } | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  useEffect(() => {
    if (!token) return;
    setSchemasLoading(true);
    listSchemas(token, REPO, BRANCH)
      .then((list) => {
        setSchemas(list);
        // Open every group by default
        setOpenGroups(
          new Set(list.map((s) => s.group?.trim() || "— Ungrouped")),
        );
        if (list.length > 0) {
          setActiveSection((prev) =>
            prev === "content-models" ? `schema:${list[0].id}` : prev,
          );
        }
      })
      .catch(() => {})
      .finally(() => setSchemasLoading(false));
  }, [token]);

  function schemaForSection(section: string): CmsSchema | null {
    if (!section.startsWith("schema:")) return null;
    const id = section.slice("schema:".length);
    return schemas.find((s) => s.id === id) ?? null;
  }

  function navigate(section: string) {
    setActiveSection(section);
    setEditingFile(null);
  }

  function handleEditFile(path: string, content: string) {
    const schema = schemaForSection(activeSection) ?? undefined;
    setEditingFile({ path, content, schema });
    setEditorKey((k) => k + 1);
  }

  function handleCloseEditor() {
    setEditingFile(null);
  }

  function renderMain() {
    if (editingFile) {
      return (
        <ContentFileEditor
          key={editorKey}
          filePath={editingFile.path}
          initialContent={editingFile.content}
          token={token}
          schema={editingFile.schema}
          allSchemas={schemas}
          onBack={handleCloseEditor}
        />
      );
    }
    if (activeSection === "groups")
      return (
        <GroupManager
          token={token}
          onSaved={() => {
            if (!token) return;
            listSchemas(token, REPO, BRANCH)
              .then((list) => {
                setSchemas(list);
                setOpenGroups(
                  new Set(list.map((s) => s.group?.trim() || "— Ungrouped")),
                );
              })
              .catch(() => {});
          }}
        />
      );
    if (activeSection === "content-models") {
      return (
        <SchemaList
          token={token}
          onSaved={(savedId) => {
            if (!token) return;
            listSchemas(token, REPO, BRANCH)
              .then((list) => {
                setSchemas(list);
                // Auto-navigate to the schema that was just saved
                if (savedId) navigate(`schema:${savedId}`);
              })
              .catch(() => {});
          }}
        />
      );
    }
    const schema = schemaForSection(activeSection);
    if (schema) {
      return (
        <ContentList
          token={token}
          schema={schema}
          onEditFile={handleEditFile}
        />
      );
    }
    return (
      <Box sx={{ p: 6, textAlign: "center" }}>
        <Typography color="text.secondary">
          Select a section from the sidebar.
        </Typography>
      </Box>
    );
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
          overflowY: "auto",
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
          {/* Grouped content sections */}
          {schemasLoading &&
            [0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                variant="rounded"
                height={40}
                sx={{ mb: 0.5, bgcolor: "rgba(255,255,255,0.05)" }}
              />
            ))}
          {!schemasLoading &&
            (() => {
              // Build ordered, stable group list (ungrouped goes last)
              const groupOrder: string[] = [];
              const groupMap = new Map<string, CmsSchema[]>();
              for (const s of schemas) {
                const g = s.group?.trim() || "— Ungrouped";
                if (!groupMap.has(g)) {
                  groupOrder.push(g);
                  groupMap.set(g, []);
                }
                groupMap.get(g)!.push(s);
              }
              const sorted = [
                ...groupOrder.filter((g) => g !== "— Ungrouped"),
                ...(groupOrder.includes("— Ungrouped") ? ["— Ungrouped"] : []),
              ];
              return sorted.map((groupName) => {
                const groupSchemas = groupMap.get(groupName)!;
                const isOpen = openGroups.has(groupName);
                const toggleGroup = () =>
                  setOpenGroups((prev) => {
                    const next = new Set(prev);
                    next.has(groupName)
                      ? next.delete(groupName)
                      : next.add(groupName);
                    return next;
                  });
                return (
                  <Box key={groupName}>
                    <ListItemButton
                      onClick={toggleGroup}
                      sx={{
                        borderRadius: 2,
                        mb: 0.5,
                        py: 0.8,
                        "&:hover": { bgcolor: "rgba(255,255,255,0.05)" },
                      }}
                    >
                      <ListItemText
                        primary={groupName.toUpperCase()}
                        primaryTypographyProps={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: 1,
                          color: "#64748b",
                        }}
                      />
                      {isOpen ? (
                        <ExpandLessIcon
                          sx={{ fontSize: 16, color: "#64748b" }}
                        />
                      ) : (
                        <ExpandMoreIcon
                          sx={{ fontSize: 16, color: "#64748b" }}
                        />
                      )}
                    </ListItemButton>
                    <Collapse in={isOpen}>
                      {groupSchemas.map((schema) => {
                        const key = `schema:${schema.id}`;
                        const selected = activeSection === key;
                        return (
                          <ListItemButton
                            key={key}
                            selected={selected}
                            onClick={() => navigate(key)}
                            sx={{
                              borderRadius: 2,
                              mb: 0.5,
                              py: 1,
                              pl: 2.5,
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
                                minWidth: 34,
                                color: "inherit",
                                opacity: selected ? 1 : 0.7,
                              }}
                            >
                              <ArticleIcon fontSize="small" />
                            </ListItemIcon>
                            <ListItemText
                              primary={schema.name}
                              primaryTypographyProps={{
                                fontWeight: 600,
                                fontSize: 13,
                                color: "inherit",
                              }}
                            />
                          </ListItemButton>
                        );
                      })}
                    </Collapse>
                  </Box>
                );
              });
            })()}
          {!schemasLoading && schemas.length === 0 && (
            <Typography
              variant="caption"
              sx={{ pl: 3, color: "#475569", display: "block", py: 1 }}
            >
              No content types yet
            </Typography>
          )}

          <Divider sx={{ borderColor: "rgba(255,255,255,0.06)", my: 1 }} />

          {/* Content Models / Groups */}
          {(
            [
              {
                key: "content-models",
                label: "Content Models",
                sub: "Define your content types",
                icon: <SchemaIcon />,
              },
              {
                key: "groups",
                label: "Organize Groups",
                sub: "Drag & drop type assignments",
                icon: <DashboardCustomizeIcon />,
              },
            ] as const
          ).map(({ key, label, sub, icon }) => {
            const selected = activeSection === key;
            return (
              <ListItemButton
                key={key}
                selected={selected}
                onClick={() => navigate(key)}
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
                  secondary={sub}
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
          <Tooltip title="Log out">
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
            >
              <LogoutIcon fontSize="small" />
            </Button>
          </Tooltip>
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
