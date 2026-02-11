import { useState, useEffect } from 'react';
import GitHubAuth from './GitHubAuth';
import CSVImporter from './CSVImporter';
import DataPreview from './DataPreview';
import PageList from './PageList';
import PageEditor from './PageEditor';
import { detectCollectionType, mapHonorsCSV, mapCentersCSV, mapTournamentsCSV, mapNewsCSV } from '../../utils/csvMappers';

type Step = 'auth' | 'select-type' | 'upload' | 'preview';
type Mode = 'csv' | 'pages' | 'page-editor';

interface ImportAdminProps {
  devToken?: string;
  isDev?: boolean;
}

export default function ImportAdmin({ devToken, isDev = false }: ImportAdminProps) {
  const [step, setStep] = useState<Step>('auth');
  const [mode, setMode] = useState<Mode>('csv');
  const [token, setToken] = useState('');
  const [username, setUsername] = useState('');
  const [collectionType, setCollectionType] = useState<string>('');
  const [, setRawData] = useState<any[]>([]);
  const [mappedData, setMappedData] = useState<any>(null);
  const [filename, setFilename] = useState('');
  const [editingSlug, setEditingSlug] = useState<string | undefined>(undefined);

  // Check for stored auth on mount
  useEffect(() => {
    // In development mode, use the dev token automatically
    if (isDev && devToken) {
      // Verify the token first
      fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${devToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      })
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error('Invalid dev token');
        })
        .then(userData => {
          setToken(devToken);
          setUsername(userData.login);
          setStep('select-type');
        })
        .catch(error => {
          console.error('Dev token authentication failed:', error);
          // Fall back to normal auth flow
        });
      return;
    }

    // Otherwise, check localStorage
    const storedToken = localStorage.getItem('github_token');
    const storedUser = localStorage.getItem('github_user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUsername(storedUser);
      setStep('select-type');
    }
  }, [isDev, devToken]);

  const handleAuthenticated = (token: string, username: string) => {
    setToken(token);
    setUsername(username);
    setStep('select-type');
  };

  const handleTypeSelect = (type: string) => {
    setCollectionType(type);
    setStep('upload');
  };

  const handleDataParsed = (data: any[], fname: string) => {
    setRawData(data);
    setFilename(fname);

    // Auto-detect collection type if not selected
    const detectedType = collectionType || detectCollectionType(fname);
    if (!detectedType) {
      alert('Could not detect collection type. Please select one manually.');
      setStep('select-type');
      return;
    }

    // Map CSV to JSON structure
    let mapped: any;
    switch (detectedType) {
      case 'honors':
        mapped = mapHonorsCSV(data, fname);
        break;
      case 'centers':
        mapped = mapCentersCSV(data);
        break;
      case 'tournaments':
        mapped = mapTournamentsCSV(data);
        break;
      case 'news':
        mapped = mapNewsCSV(data);
        break;
      default:
        alert('Invalid collection type');
        return;
    }

    setMappedData(mapped);
    setCollectionType(detectedType);
    setStep('preview');
  };

  const handleLogout = () => {
    localStorage.removeItem('github_token');
    localStorage.removeItem('github_user');
    setToken('');
    setUsername('');
    setStep('auth');
  };

  const handleEditPage = (slug: string) => {
    setEditingSlug(slug);
    setMode('page-editor');
  };

  const handleCreateNewPage = () => {
    setEditingSlug(undefined);
    setMode('page-editor');
  };

  const handlePageSaved = () => {
    setEditingSlug(undefined);
    setMode('pages');
  };

  const handleCancelEdit = () => {
    setEditingSlug(undefined);
    setMode('pages');
  };

  if (step === 'auth') {
    return <GitHubAuth onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">🎳 GFCBA CMS</h1>
                {isDev && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded">
                    DEV MODE
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600">Logged in as {username}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => {
                setMode('csv');
                setStep('select-type');
              }}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                mode === 'csv'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              CSV Import
            </button>
            <button
              onClick={() => setMode('pages')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                mode === 'pages' || mode === 'page-editor'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              Pages
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* CSV Import Mode */}
        {mode === 'csv' && (
          <>
            {/* Progress Steps */}
            <div className="mb-8">
              <div className="flex items-center justify-center space-x-4">
                {['Select Type', 'Upload CSV', 'Preview & Publish'].map((label, idx) => (
                  <div key={label} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      idx < (['select-type', 'upload', 'preview'].indexOf(step) + 1)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-300 text-gray-600'
                    } font-semibold text-sm`}>
                      {idx + 1}
                    </div>
                    <span className="ml-2 text-sm font-medium text-gray-700">{label}</span>
                    {idx < 2 && <span className="mx-4 text-gray-400">→</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Step Content */}
            {step === 'select-type' && (
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-lg shadow-lg p-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">
                    What type of data are you importing?
                  </h2>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { type: 'honors', label: '🏆 Honors & Awards', desc: '300 games, high scores, achievements' },
                      { type: 'tournaments', label: '🎯 Tournaments', desc: 'Tournament schedules and results' },
                      { type: 'centers', label: '🎳 Bowling Centers', desc: 'Center information and details' },
                      { type: 'news', label: '📰 News Articles', desc: 'News and announcements' },
                    ].map(({ type, label, desc }) => (
                      <button
                        key={type}
                        onClick={() => handleTypeSelect(type)}
                        className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
                      >
                        <div className="text-xl font-semibold mb-2">{label}</div>
                        <div className="text-sm text-gray-600">{desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {step === 'upload' && (
              <div className="max-w-4xl mx-auto">
                <div className="mb-6">
                  <button
                    onClick={() => setStep('select-type')}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Change Type
                  </button>
                </div>
                <CSVImporter 
                  onDataParsed={handleDataParsed}
                  collectionType={collectionType as any}
                />
              </div>
            )}

            {step === 'preview' && mappedData && (
              <DataPreview
                data={mappedData}
                collectionType={collectionType}
                filename={filename}
                onBack={() => setStep('upload')}
                token={token}
                repo="myoung-admin/gfcba"
              />
            )}
          </>
        )}

        {/* Pages Management Mode */}
        {mode === 'pages' && (
          <PageList
            token={token}
            onEdit={handleEditPage}
            onCreateNew={handleCreateNewPage}
          />
        )}

        {/* Page Editor Mode */}
        {mode === 'page-editor' && (
          <PageEditor
            slug={editingSlug}
            token={token}
            onSave={handlePageSaved}
            onCancel={handleCancelEdit}
          />
        )}
      </main>
    </div>
  );
}
