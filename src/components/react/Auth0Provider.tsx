import { Auth0Provider as Auth0ProviderSDK } from "@auth0/auth0-react";
import type { ReactNode } from "react";

interface Auth0ProviderProps {
  children: ReactNode;
}

export default function Auth0Provider({ children }: Auth0ProviderProps) {
  const domain = import.meta.env.PUBLIC_AUTH0_DOMAIN || "";
  const clientId = import.meta.env.PUBLIC_AUTH0_CLIENT_ID || "";
  const redirectUri =
    typeof window !== "undefined" ? window.location.origin + "/admin" : "";

  if (!domain || !clientId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Auth0 Not Configured
            </h1>
            <p className="text-gray-600 mb-4">
              Please set the following environment variables:
            </p>
            <div className="bg-gray-100 rounded-lg p-4 text-left font-mono text-sm mb-4">
              <div>PUBLIC_AUTH0_DOMAIN</div>
              <div>PUBLIC_AUTH0_CLIENT_ID</div>
            </div>
            <p className="text-sm text-gray-500">
              See AUTH0-SETUP.md for instructions
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Auth0ProviderSDK
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: redirectUri,
        scope: "openid profile email",
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      {children}
    </Auth0ProviderSDK>
  );
}
