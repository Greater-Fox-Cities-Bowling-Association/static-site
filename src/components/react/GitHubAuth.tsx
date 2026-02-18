import { useState, useEffect } from "react";

interface GitHubAuthProps {
  onAuthenticated: (token: string, username: string) => void;
}

// PKCE utility functions
function generateRandomString(length: number): string {
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let text = "";
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

async function sha256(plain: string): Promise<ArrayBuffer> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return await crypto.subtle.digest("SHA-256", data);
}

function base64urlencode(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    str += String.fromCharCode(bytes[i]!);
  }
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const hashed = await sha256(verifier);
  return base64urlencode(hashed);
}

// Check if user has write access to the repository
async function checkRepositoryAccess(
  token: string,
  username: string,
): Promise<{ authorized: boolean; reason?: string }> {
  const repoOwner =
    import.meta.env.PUBLIC_GITHUB_OWNER || import.meta.env.GITHUB_OWNER;
  const repoName =
    import.meta.env.PUBLIC_GITHUB_REPO || import.meta.env.GITHUB_REPO;

  if (!repoOwner || !repoName) {
    console.warn("Repository not configured. Skipping access check.");
    return { authorized: true };
  }

  try {
    // Check user's permission level on the repository
    const response = await fetch(
      `https://api.github.com/repos/${repoOwner}/${repoName}/collaborators/${username}/permission`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      },
    );

    if (!response.ok) {
      // If 404, user has no access to the repo
      if (response.status === 404) {
        return {
          authorized: false,
          reason: `Access denied. You need write access to ${repoOwner}/${repoName}`,
        };
      }
      throw new Error("Failed to check repository permissions");
    }

    const data = await response.json();
    const permission = data.permission;

    // Only allow admin or write access
    if (!["admin", "write"].includes(permission)) {
      return {
        authorized: false,
        reason: `Insufficient permissions. You have '${permission}' access but need 'write' or 'admin' access.`,
      };
    }

    return { authorized: true };
  } catch (err) {
    console.error("Error checking repository access:", err);
    // If check fails, deny access to be safe
    return {
      authorized: false,
      reason: "Unable to verify repository access. Please try again.",
    };
  }
}

export default function GitHubAuth({ onAuthenticated }: GitHubAuthProps) {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManualToken, setShowManualToken] = useState(false);

  // GitHub OAuth App settings - user needs to set these
  const GITHUB_CLIENT_ID = import.meta.env.PUBLIC_GITHUB_CLIENT_ID || "";
  const REDIRECT_URI =
    typeof window !== "undefined" ? window.location.origin + "/admin" : "";

  // Handle OAuth callback on mount
  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const storedVerifier = sessionStorage.getItem("pkce_verifier");

      if (code && storedVerifier) {
        setLoading(true);
        setError(null);

        try {
          // Exchange code for token
          const tokenResponse = await fetch(
            "https://github.com/login/oauth/access_token",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
              },
              body: JSON.stringify({
                client_id: GITHUB_CLIENT_ID,
                code: code,
                code_verifier: storedVerifier,
              }),
            },
          );

          const tokenData = await tokenResponse.json();

          if (tokenData.error) {
            throw new Error(tokenData.error_description || "OAuth failed");
          }

          const accessToken = tokenData.access_token;

          // Get user info
          const userResponse = await fetch("https://api.github.com/user", {
            headers: {
              Authorization: `token ${accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          });

          if (!userResponse.ok) {
            throw new Error("Failed to get user info");
          }

          const userData = await userResponse.json();

          // Check repository access
          const accessCheck = await checkRepositoryAccess(
            accessToken,
            userData.login,
          );

          if (!accessCheck.authorized) {
            throw new Error(accessCheck.reason || "Access denied");
          }

          // Store and authenticate
          localStorage.setItem("github_token", accessToken);
          localStorage.setItem("github_user", userData.login);
          sessionStorage.removeItem("pkce_verifier");

          // Clean up URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );

          onAuthenticated(accessToken, userData.login);
        } catch (err) {
          setError(
            err instanceof Error ? err.message : "OAuth authentication failed",
          );
          sessionStorage.removeItem("pkce_verifier");
          // Clean up URL
          window.history.replaceState(
            {},
            document.title,
            window.location.pathname,
          );
        } finally {
          setLoading(false);
        }
      }
    };

    handleCallback();
  }, []);

  const handleOAuthLogin = async () => {
    if (!GITHUB_CLIENT_ID) {
      setError(
        "GitHub OAuth not configured. Please set PUBLIC_GITHUB_CLIENT_ID in .env",
      );
      setShowManualToken(true);
      return;
    }

    try {
      // Generate PKCE parameters
      const codeVerifier = generateRandomString(128);
      const codeChallenge = await generateCodeChallenge(codeVerifier);

      // Store verifier for later
      sessionStorage.setItem("pkce_verifier", codeVerifier);

      // Redirect to GitHub OAuth
      const authUrl = new URL("https://github.com/login/oauth/authorize");
      authUrl.searchParams.append("client_id", GITHUB_CLIENT_ID);
      authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
      authUrl.searchParams.append("scope", "repo");
      authUrl.searchParams.append("code_challenge", codeChallenge);
      authUrl.searchParams.append("code_challenge_method", "S256");

      window.location.href = authUrl.toString();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initiate OAuth");
    }
  };

  const handleTokenAuth = async () => {
    if (!token.trim()) {
      setError("Please enter a GitHub token");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Verify token by fetching user info
      const response = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!response.ok) {
        throw new Error("Invalid token or unauthorized");
      }

      const userData = await response.json();

      // Check repository access
      const accessCheck = await checkRepositoryAccess(token, userData.login);

      if (!accessCheck.authorized) {
        throw new Error(accessCheck.reason || "Access denied");
      }

      localStorage.setItem("github_token", token);
      localStorage.setItem("github_user", userData.login);
      onAuthenticated(token, userData.login);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-background rounded-2xl shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🎳</div>
          <h1 className="text-3xl font-bold text-text mb-2">GFCBA Admin</h1>
          <p className="text-text-secondary">
            Import CSV data to update your website
          </p>
        </div>

        <div className="space-y-4">
          {/* Primary: OAuth Sign In */}
          {!showManualToken && (
            <>
              <button
                onClick={handleOAuthLogin}
                disabled={loading}
                className="w-full bg-secondary text-background py-3 px-4 rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                {loading ? "Signing in..." : "Sign in with GitHub"}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-text/20"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-background text-text-secondary">
                    or
                  </span>
                </div>
              </div>

              <button
                onClick={() => setShowManualToken(true)}
                className="w-full text-sm text-text-secondary hover:text-text underline"
              >
                Use personal access token instead
              </button>
            </>
          )}

          {/* Fallback: Manual Token Entry */}
          {showManualToken && (
            <>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  GitHub Personal Access Token
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-4 py-3 border border-text/20 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  onKeyDown={(e) => e.key === "Enter" && handleTokenAuth()}
                />
                <p className="mt-2 text-xs text-text-secondary">
                  Need a token?{" "}
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=GFCBA%20Admin"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Create one here
                  </a>{" "}
                  (select 'repo' scope)
                </p>
              </div>

              <button
                onClick={handleTokenAuth}
                disabled={loading}
                className="w-full bg-primary text-background py-3 px-4 rounded-lg font-semibold hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "Authenticating..." : "Continue →"}
              </button>

              {GITHUB_CLIENT_ID && (
                <button
                  onClick={() => setShowManualToken(false)}
                  className="w-full text-sm text-text-secondary hover:text-text underline"
                >
                  ← Back to OAuth sign in
                </button>
              )}
            </>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-700">⚠️ {error}</p>
            </div>
          )}
        </div>

        <div className="mt-6 p-4 bg-primary/10 rounded-lg">
          <p className="text-sm text-primary">
            <strong>Secure:</strong>{" "}
            {showManualToken ? "Your token is" : "Authentication is"} stored
            locally and only used to commit updates to GitHub.
          </p>
        </div>
      </div>
    </div>
  );
}
