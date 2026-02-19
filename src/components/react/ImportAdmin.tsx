import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect } from "react";
import Auth0Login from "./Auth0Login";
import PageList from "./PageList";
import PageEditor from "./PageEditor";
import LayoutList from "./LayoutList";
import LayoutEditor from "./LayoutEditor";
import ThemeList from "./ThemeList";
import ThemeEditor from "./ThemeEditor";
import ComponentSchemaEditor from "./ComponentSchemaEditor";
import ComponentSchemaList from "./ComponentSchemaList";

type Mode =
  | "themes"
  | "theme-editor"
  | "layouts"
  | "layout-editor"
  | "pages"
  | "page-editor"
  | "components"
  | "component-editor";

export default function ImportAdmin() {
  const { isLoading, error, isAuthenticated, user, logout, getIdTokenClaims } =
    useAuth0();

  const [mode, setMode] = useState<Mode>("pages");
  const [editingSlug, setEditingSlug] = useState<string | undefined>(undefined);
  const [editingLayoutId, setEditingLayoutId] = useState<string | undefined>(
    undefined,
  );
  const [editingThemeId, setEditingThemeId] = useState<string | undefined>(
    undefined,
  );
  const [editingComponentName, setEditingComponentName] = useState<
    string | undefined
  >(undefined);

  // GitHub authentication state
  const [githubToken, setGithubToken] = useState<string>("");
  const [githubUser, setGithubUser] = useState<string>("");

  // Dev mode: toggle between local files and GitHub API
  const [useGitHubAPI, setUseGitHubAPI] = useState<boolean>(false);
  const isDev = import.meta.env.DEV;

  const githubRepo = `${import.meta.env.PUBLIC_GITHUB_OWNER || import.meta.env.GITHUB_OWNER}/${import.meta.env.PUBLIC_GITHUB_REPO || import.meta.env.GITHUB_REPO}`;

  // Get GitHub token from Auth0 custom claims
  useEffect(() => {
    const fetchTokenClaims = async () => {
      if (isAuthenticated) {
        try {
          // Get fresh token claims
          const claims = await getIdTokenClaims();

          // Check for GitHub token in custom claim
          const token = claims?.["https://gfcba.com/github_token"];

          if (token) {
            setGithubToken(token);
            setGithubUser("fox-cities-bowling-association");
            localStorage.setItem("github_token", token);
            localStorage.setItem(
              "github_user",
              "fox-cities-bowling-association",
            );
          } else {
            console.warn("❌ No GitHub token found in ID token claims");
            console.warn("Expected claim: https://gfcba.com/github_token");
            console.warn(
              "Available custom claims:",
              Object.keys(claims || {}).filter((k) => k.includes("http")),
            );

            // Fallback: check for stored token
            const storedToken = localStorage.getItem("github_token");
            const storedUser = localStorage.getItem("github_user");
            if (storedToken && storedUser) {
              setGithubToken(storedToken);
              setGithubUser(storedUser);
            }
          }
        } catch (err) {
          console.error("Error fetching token claims:", err);
        }
      }
    };

    fetchTokenClaims();
  }, [isAuthenticated, getIdTokenClaims]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-text mb-2">
              Initializing Authentication...
            </h2>
            <p className="text-text-secondary">
              Please wait while we set up your session
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500/10 to-red-100 flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-text mb-2">
              Authentication Error
            </h2>
            <p className="text-text-secondary mb-4">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-primary text-background px-6 py-2 rounded-lg hover:bg-accent transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth0Login onAuthenticated={() => {}} />;
  }

  const handleLogout = () => {
    localStorage.removeItem("github_token");
    localStorage.removeItem("github_user");
    setGithubToken("");
    setGithubUser("");
    logout({
      logoutParams: {
        returnTo: window.location.origin + "/admin",
      },
    });
  };

  const handleEditPage = (slug: string) => {
    setEditingSlug(slug);
    setMode("page-editor");
  };

  const handleCreateNewPage = () => {
    setEditingSlug(undefined);
    setMode("page-editor");
  };

  const handlePageSaved = () => {
    setMode("pages");
    setEditingSlug(undefined);
  };

  const handleCancelEdit = () => {
    setMode("pages");
    setEditingSlug(undefined);
  };

  const handleEditLayout = (layoutId: string) => {
    setEditingLayoutId(layoutId);
    setMode("layout-editor");
  };

  const handleCreateNewLayout = () => {
    setEditingLayoutId(undefined);
    setMode("layout-editor");
  };

  const handleLayoutSaved = () => {
    setMode("layouts");
    setEditingLayoutId(undefined);
  };

  const handleCancelLayoutEdit = () => {
    setMode("layouts");
    setEditingLayoutId(undefined);
  };

  const handleEditTheme = (themeId: string) => {
    setEditingThemeId(themeId);
    setMode("theme-editor");
  };

  const handleCreateNewTheme = () => {
    setEditingThemeId(undefined);
    setMode("theme-editor");
  };

  const handleThemeSaved = () => {
    setMode("themes");
    setEditingThemeId(undefined);
  };

  const handleCancelThemeEdit = () => {
    setMode("themes");
    setEditingThemeId(undefined);
  };

  const handleEditComponent = (componentName: string) => {
    setEditingComponentName(componentName);
    setMode("component-editor");
  };

  const handleCreateNewComponent = () => {
    setEditingComponentName(undefined);
    setMode("component-editor");
  };

  const handleComponentSaved = () => {
    setMode("components");
    setEditingComponentName(undefined);
  };

  const handleCancelComponentEdit = () => {
    setMode("components");
    setEditingComponentName(undefined);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-background shadow-sm border-b border-text/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-text">
                🏆 GFCBA Admin Panel
              </h1>
              <p className="text-sm text-text-secondary mt-1">
                Logged in as {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {!githubToken ? (
        <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
          <div className="bg-background rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-text mb-2">
                Setting up GitHub access...
              </h2>
              <p className="text-text-secondary">
                Please wait while we configure your repository access
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-background rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="text-2xl">✓</div>
              <div>
                <p className="text-sm font-medium text-text">
                  Connected to GitHub as @{githubUser}
                </p>
                <p className="text-xs text-text-secondary">
                  Repository: {githubRepo}
                </p>
              </div>
            </div>
          </div>

          {isDev && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg shadow-sm p-4 mb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🔧</div>
                  <div>
                    <h3 className="font-semibold text-text">
                      Development Mode
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {useGitHubAPI
                        ? "Using GitHub API (testing production behavior)"
                        : "Using local files (faster development)"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setUseGitHubAPI(!useGitHubAPI)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    useGitHubAPI
                      ? "bg-primary text-background hover:bg-accent"
                      : "bg-text/10 text-text hover:bg-text/20"
                  }`}
                >
                  {useGitHubAPI ? "Switch to Local Files" : "Test GitHub API"}
                </button>
              </div>
            </div>
          )}

          <div className="bg-background rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-text mb-4">
              Admin Panel
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setMode("themes")}
                className={`p-6 rounded-lg border-2 transition-all ${
                  mode === "themes" || mode === "theme-editor"
                    ? "border-primary bg-primary/10"
                    : "border-text/20 hover:border-primary/50"
                }`}
              >
                <div className="text-4xl mb-3">🎨</div>
                <h3 className="font-semibold text-text mb-1">Theme Manager</h3>
                <p className="text-sm text-text-secondary">
                  Customize colors, fonts, and visual styles
                </p>
              </button>
              <button
                onClick={() => setMode("layouts")}
                className={`p-6 rounded-lg border-2 transition-all ${
                  mode === "layouts" || mode === "layout-editor"
                    ? "border-primary bg-primary/10"
                    : "border-text/20 hover:border-primary/50"
                }`}
              >
                <div className="text-4xl mb-3">📐</div>
                <h3 className="font-semibold text-text mb-1">Layout Manager</h3>
                <p className="text-sm text-text-secondary">
                  Configure layouts, navigation & footer
                </p>
              </button>
              <button
                onClick={() => setMode("pages")}
                className={`p-6 rounded-lg border-2 transition-all ${
                  mode === "pages" || mode === "page-editor"
                    ? "border-primary bg-primary/10"
                    : "border-text/20 hover:border-primary/50"
                }`}
              >
                <div className="text-4xl mb-3">📄</div>
                <h3 className="font-semibold text-text mb-1">Page Manager</h3>
                <p className="text-sm text-text-secondary">
                  Build pages with sections and content
                </p>
              </button>
              <button
                onClick={() => setMode("components")}
                className={`p-6 rounded-lg border-2 transition-all ${
                  mode === "components" || mode === "component-editor"
                    ? "border-primary bg-primary/10"
                    : "border-text/20 hover:border-primary/50"
                }`}
              >
                <div className="text-4xl mb-3">🧩</div>
                <h3 className="font-semibold text-text mb-1">
                  Component Schema
                </h3>
                <p className="text-sm text-text-secondary">
                  Define reusable component schemas
                </p>
              </button>
            </div>
          </div>

          {mode === "pages" && (
            <PageList
              token={githubToken}
              onEdit={handleEditPage}
              onCreateNew={handleCreateNewPage}
              useGitHubAPI={useGitHubAPI}
            />
          )}

          {mode === "page-editor" && (
            <PageEditor
              slug={editingSlug}
              token={githubToken}
              onSave={handlePageSaved}
              onCancel={handleCancelEdit}
              useGitHubAPI={useGitHubAPI}
            />
          )}

          {mode === "layouts" && (
            <LayoutList
              token={githubToken}
              onEdit={handleEditLayout}
              onCreateNew={handleCreateNewLayout}
              useGitHubAPI={useGitHubAPI}
            />
          )}

          {mode === "layout-editor" && (
            <LayoutEditor
              layoutId={editingLayoutId}
              token={githubToken}
              onSave={handleLayoutSaved}
              onCancel={handleCancelLayoutEdit}
              useGitHubAPI={useGitHubAPI}
            />
          )}

          {mode === "themes" && (
            <ThemeList
              token={githubToken}
              onEditTheme={handleEditTheme}
              onCreateNewTheme={handleCreateNewTheme}
              useGitHubAPI={useGitHubAPI}
            />
          )}

          {mode === "theme-editor" && (
            <ThemeEditor
              themeId={editingThemeId}
              token={githubToken}
              onSave={handleThemeSaved}
              onCancel={handleCancelThemeEdit}
              useGitHubAPI={useGitHubAPI}
            />
          )}

          {mode === "components" && (
            <ComponentSchemaList
              token={githubToken}
              onEdit={handleEditComponent}
              onCreateNew={handleCreateNewComponent}
              useGitHubAPI={useGitHubAPI}
            />
          )}

          {mode === "component-editor" && (
            <ComponentSchemaEditor
              componentName={editingComponentName ?? "new-component"}
              token={githubToken}
              onSave={handleComponentSaved}
              onCancel={handleCancelComponentEdit}
              useGitHubAPI={useGitHubAPI}
            />
          )}
        </div>
      )}
    </div>
  );
}
