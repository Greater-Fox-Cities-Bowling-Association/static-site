import { useAuth0 } from "@auth0/auth0-react";
import { useState, useEffect } from "react";
import Papa from "papaparse";
import Auth0Login from "./Auth0Login";
import PageList from "./PageList";
import PageEditor from "./PageEditor";

type Step = "select-type" | "upload" | "preview";
type Mode = "csv" | "pages" | "page-editor";

export default function ImportAdmin() {
  const { isLoading, error, isAuthenticated, user, logout } = useAuth0();
  console.log("Auth0 State:", { isLoading, isAuthenticated, error });

  const [step, setStep] = useState<Step>("select-type");
  const [mode, setMode] = useState<Mode>("csv");
  const [collectionType, setCollectionType] = useState<string>("");
  const [, setRawData] = useState<any[]>([]);
  const [mappedData, setMappedData] = useState<any>(null);
  const [filename, setFilename] = useState("");
  const [editingSlug, setEditingSlug] = useState<string | undefined>(undefined);

  // GitHub authentication state
  const [githubToken, setGithubToken] = useState<string>("");
  const [githubUser, setGithubUser] = useState<string>("");

  const githubRepo = `${import.meta.env.PUBLIC_GITHUB_OWNER || import.meta.env.GITHUB_OWNER}/${import.meta.env.PUBLIC_GITHUB_REPO || import.meta.env.GITHUB_REPO}`;

  // Get GitHub token from Auth0 custom claims
  useEffect(() => {
    if (isAuthenticated && user) {
      // Check if user has the GitHub token in custom claims (from Auth0 Action)
      const token = (user as any)["https://gfcba.com/github_token"];

      if (token) {
        setGithubToken(token);
        setGithubUser("fox-cities-bowling-association");
        localStorage.setItem("github_token", token);
        localStorage.setItem("github_user", "fox-cities-bowling-association");
        console.log("GitHub token received from Auth0");
      } else {
        console.warn("No GitHub token found in Auth0 claims");
        // Fallback: check for stored token
        const storedToken = localStorage.getItem("github_token");
        const storedUser = localStorage.getItem("github_user");
        if (storedToken && storedUser) {
          setGithubToken(storedToken);
          setGithubUser(storedUser);
        }
      }
    }
  }, [isAuthenticated, user]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Initializing Authentication...
            </h2>
            <p className="text-gray-600">
              Please wait while we set up your session
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center">
            <div className="text-5xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Authentication Error
            </h2>
            <p className="text-gray-600 mb-4">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
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

  const handleTypeSelect = (type: string) => {
    setCollectionType(type);
    setStep("upload");
  };

  const handleDataParsed = (data: any[], fname: string) => {
    setRawData(data);
    setFilename(fname);

    const mapped = mapCsvData(data, collectionType);
    setMappedData(mapped);
    setStep("preview");
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                🏆 GFCBA Admin Panel
              </h1>
              <p className="text-sm text-gray-600 mt-1">
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
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Setting up GitHub access...
              </h2>
              <p className="text-gray-600">
                Please wait while we configure your repository access
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="text-2xl">✓</div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Connected to GitHub as @{githubUser}
                </p>
                <p className="text-xs text-gray-600">
                  Repository: {githubRepo}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Select Mode
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => setMode("csv")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  mode === "csv"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="text-3xl mb-2">📊</div>
                <h3 className="font-semibold text-gray-900">CSV Import</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Import data from CSV files
                </p>
              </button>
              <button
                onClick={() => setMode("pages")}
                className={`p-4 rounded-lg border-2 transition-all ${
                  mode === "pages" || mode === "page-editor"
                    ? "border-blue-600 bg-blue-50"
                    : "border-gray-200 hover:border-blue-300"
                }`}
              >
                <div className="text-3xl mb-2">📄</div>
                <h3 className="font-semibold text-gray-900">Page Manager</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Create and edit dynamic pages
                </p>
              </button>
            </div>
          </div>

          {mode === "csv" && (
            <CsvImportPanel
              step={step}
              collectionType={collectionType}
              mappedData={mappedData}
              filename={filename}
              onTypeSelect={handleTypeSelect}
              onDataParsed={handleDataParsed}
              onBack={() => setStep("select-type")}
            />
          )}

          {mode === "pages" && (
            <PageList
              token={githubToken}
              onEdit={handleEditPage}
              onCreateNew={handleCreateNewPage}
            />
          )}

          {mode === "page-editor" && (
            <PageEditor
              slug={editingSlug}
              token={githubToken}
              onSave={handlePageSaved}
              onCancel={handleCancelEdit}
            />
          )}
        </div>
      )}
    </div>
  );
}

function mapCsvData(data: any[], collectionType: string) {
  return data;
}

function CsvImportPanel({
  step,
  collectionType,
  mappedData,
  filename,
  onTypeSelect,
  onDataParsed,
  onBack,
}: any) {
  const [, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          onDataParsed(results.data, selectedFile.name);
        },
      });
    }
  };

  if (step === "select-type") {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Select Collection Type
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {["honors", "tournaments", "centers", "news"].map((type) => (
            <button
              key={type}
              onClick={() => onTypeSelect(type)}
              className="p-4 rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all"
            >
              <h3 className="font-semibold text-gray-900 capitalize">{type}</h3>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === "upload") {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <button
          onClick={onBack}
          className="mb-4 text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Upload CSV for {collectionType}
        </h2>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <button
          onClick={onBack}
          className="mb-4 text-sm text-gray-600 hover:text-gray-900"
        >
          ← Back
        </button>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Preview: {filename}
        </h2>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-sm">
          {JSON.stringify(mappedData, null, 2)}
        </pre>
        <div className="mt-4 flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => alert("Import functionality to be implemented")}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Import Data
          </button>
        </div>
      </div>
    );
  }

  return null;
}
