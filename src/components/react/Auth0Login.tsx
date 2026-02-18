import { useAuth0 } from "@auth0/auth0-react";
import { useEffect } from "react";

interface Auth0LoginProps {
  onAuthenticated: () => void;
}

export default function Auth0Login({ onAuthenticated }: Auth0LoginProps) {
  const { loginWithRedirect, isAuthenticated, isLoading, error, user } =
    useAuth0();

  useEffect(() => {
    if (isAuthenticated) {
      onAuthenticated();
    }
  }, [isAuthenticated, onAuthenticated]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin text-5xl mb-4">🎳</div>
            <h1 className="text-2xl font-bold text-text">Loading...</h1>
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
            <h1 className="text-3xl font-bold text-text mb-2">
              Authentication Error
            </h1>
            <p className="text-text-secondary mb-6">{error.message}</p>
            <button
              onClick={() => loginWithRedirect()}
              className="w-full bg-primary text-background py-3 px-4 rounded-lg font-semibold hover:bg-accent transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    // User is authenticated, but we show this briefly before onAuthenticated callback
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="bg-background rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-5xl mb-4">✅</div>
            <h1 className="text-2xl font-bold text-text mb-2">
              Welcome, {user.name}!
            </h1>
            <p className="text-text-secondary">Loading admin dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login screen
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
          <button
            onClick={() => loginWithRedirect()}
            className="w-full bg-primary text-background py-3 px-4 rounded-lg font-semibold hover:bg-accent transition-colors flex items-center justify-center gap-3"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            Sign in to Continue
          </button>
        </div>

        <div className="mt-6 p-4 bg-primary/10 rounded-lg">
          <p className="text-sm text-primary">
            <strong>Secure:</strong> Authenticated via Auth0. Site updates are
            committed to GitHub using a secure token.
          </p>
        </div>
      </div>
    </div>
  );
}
