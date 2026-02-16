interface GitHubCommitOptions {
  token: string;
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  branch?: string;
}

interface GitHubFileResponse {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string | null;
  type: 'file' | 'dir';
  content?: string; // Base64 encoded, only present when getting file content
  encoding?: 'base64';
}

// =============================================================================
// Debug & Logging Utilities
// =============================================================================

const DEBUG = typeof import.meta !== 'undefined' ? import.meta.env.DEV : false;

interface APICallDetails {
  function: string;
  mode: 'LOCAL' | 'GITHUB_API';
  params: Record<string, any>;
  url?: string;
  method?: string;
}

function logAPICall(details: APICallDetails) {
  if (!DEBUG) return;
  
  const style = details.mode === 'LOCAL' 
    ? 'background: #22c55e; color: white; padding: 2px 6px; border-radius: 3px;'
    : 'background: #3b82f6; color: white; padding: 2px 6px; border-radius: 3px;';
  
  console.groupCollapsed(
    `%c${details.mode}%c ${details.function}`,
    style,
    'font-weight: bold;'
  );
  console.log('Parameters:', details.params);
  if (details.url) console.log('API URL:', details.url);
  if (details.method) console.log('HTTP Method:', details.method);
  console.groupEnd();
}

function logAPIResponse(functionName: string, mode: string, response: any, error?: any) {
  if (!DEBUG) return;
  
  if (error) {
    console.group(`%c❌ ${functionName} - FAILED`, 'color: #ef4444; font-weight: bold;');
    console.error('Error:', error);
    console.groupEnd();
  } else {
    console.group(`%c✅ ${functionName} - SUCCESS`, 'color: #10b981; font-weight: bold;');
    console.log('Mode:', mode);
    console.log('Response:', response);
    console.groupEnd();
  }
}

/**
 * Compare local vs GitHub API responses (useful for debugging)
 * Set forceGitHubAPI=true to test production behavior in dev mode
 */
export function enableGitHubAPITesting() {
  console.log(
    '%c🔍 GitHub API Testing Mode',
    'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 3px; font-size: 14px; font-weight: bold;'
  );
  console.log('Pass forceGitHubAPI: true to any function to test GitHub API in dev mode');
  console.log('Example: fetchPagesDirectory(token, owner, repo, true)');
}

// Get defaults from environment variables
const DEFAULT_OWNER = typeof import.meta !== 'undefined' 
  ? (import.meta.env.PUBLIC_GITHUB_OWNER || import.meta.env.GITHUB_OWNER || 'myoung-admin')
  : 'myoung-admin';
const DEFAULT_REPO = typeof import.meta !== 'undefined'
  ? (import.meta.env.PUBLIC_GITHUB_REPO || import.meta.env.GITHUB_REPO || 'gfcba')
  : 'gfcba';
const PAGES_PATH = 'src/content/pages';

export async function commitToGitHub({
  token,
  owner,
  repo,
  path,
  content,
  message,
  branch = 'main'
}: GitHubCommitOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Include branch in the query string when checking for existing file
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const apiUrlWithBranch = `${apiUrl}?ref=${branch}`;
  
    // Check if file exists to get SHA
    let sha: string | undefined;
    try {
      const existingFile = await fetch(apiUrlWithBranch, {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (existingFile.ok) {
        const data = await existingFile.json();
        sha = data.sha;
      }
    } catch {
      // File doesn't exist, will create new
    }

    // Create or update file
    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        content: btoa(new TextEncoder().encode(content).reduce((data, byte) => data + String.fromCharCode(byte), '')), // Base64 encode
        branch,
        ...(sha && { sha }) // Include SHA if updating existing file
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('GitHub API Error:', errorData);
      throw new Error(errorData.message || `Failed to commit to GitHub (${response.status})`);
    }

    return { success: true };
  } catch (error) {
    console.error('commitToGitHub error:', error);
    
    // Check if this is a branch-not-found error (404)
    if (error instanceof Error && error.message.includes('Not Found')) {
      return {
        success: false,
        error: `Branch "${branch}" not found on remote. Push your branch to GitHub first, or switch to main branch to publish.`
      };
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Generate filename from data
export function generateFilename(collectionType: string, data: any, originalFilename: string): string {
  const sanitize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  
  switch (collectionType) {
    case 'honors':
      return `${sanitize(data.category)}-${data.year}.json`;
    case 'centers':
      return `${sanitize(data.name)}.json`;
    case 'tournaments':
      return `${sanitize(data.name)}.json`;
    case 'news':
      return `${sanitize(data.title)}.json`;
    default:
      return sanitize(originalFilename.replace('.csv', '')) + '.json';
  }
}

// =============================================================================
// Page Management API Functions
// =============================================================================

/**
 * Fetch all pages from the GitHub repository
 */
export async function fetchPagesDirectory(
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<{ success: boolean; files?: GitHubFileResponse[]; error?: string }> {
  try {
    // DEV MODE: Read from local filesystem (unless forced to use GitHub API)
    if (import.meta.env.DEV && !forceGitHubAPI) {
      logAPICall({
        function: 'fetchPagesDirectory',
        mode: 'LOCAL',
        params: { owner, repo, path: PAGES_PATH }
      });

      try {
        // Dynamically import all JSON files from the pages directory
        const pageModules = import.meta.glob('/src/content/pages/*.json', { eager: true });
        
        const files: GitHubFileResponse[] = Object.entries(pageModules).map(([path, _module]: [string, any]) => {
          const filename = path.split('/').pop() || '';
          return {
            name: filename,
            path: `${PAGES_PATH}/${filename}`,
            sha: '', // Not needed for local dev
            size: 0,
            url: '',
            html_url: '',
            git_url: '',
            download_url: path,
            type: 'file' as const,
          };
        });

        logAPIResponse('fetchPagesDirectory', 'LOCAL', { fileCount: files.length, files: files.map(f => f.name) });
        return { success: true, files };
      } catch (error) {
        logAPIResponse('fetchPagesDirectory', 'LOCAL', null, error);
        // If directory doesn't exist yet, return empty array
        return { success: true, files: [] };
      }
    }

    // PRODUCTION MODE: Fetch from GitHub
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${PAGES_PATH}`;
    
    logAPICall({
      function: 'fetchPagesDirectory',
      mode: 'GITHUB_API',
      params: { owner, repo, path: PAGES_PATH },
      url: apiUrl,
      method: 'GET'
    });

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Directory doesn't exist yet
        logAPIResponse('fetchPagesDirectory', 'GITHUB_API', { fileCount: 0, message: 'Directory not found (404), returning empty array' });
        return { success: true, files: [] };
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch pages directory');
    }

    const data: GitHubFileResponse[] = await response.json();
    
    // Filter to only JSON files
    const jsonFiles = data.filter(file => 
      file.type === 'file' && file.name.endsWith('.json')
    );

    logAPIResponse('fetchPagesDirectory', 'GITHUB_API', { 
      fileCount: jsonFiles.length, 
      files: jsonFiles.map(f => ({ name: f.name, size: f.size, sha: f.sha.substring(0, 7) }))
    });
    return { success: true, files: jsonFiles };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Fetch a single page's content by slug
 */
export async function fetchPageContent(
  slug: string,
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<{ success: boolean; content?: any; sha?: string; error?: string }> {
  try {
    const filename = `${slug}.json`;

    // DEV MODE: Read from local filesystem (unless forced to use GitHub API)
    if (import.meta.env.DEV && !forceGitHubAPI) {
      logAPICall({
        function: 'fetchPageContent',
        mode: 'LOCAL',
        params: { slug, filename }
      });

      try {
        const module = await import(`../../content/pages/${filename}`);
        const content = module.default;
        logAPIResponse('fetchPageContent', 'LOCAL', { 
          slug, 
          title: content.title,
          sections: content.sections?.length || 0
        });
        return {
          success: true,
          content,
          sha: '' // Not needed for local dev
        };
      } catch (error) {
        logAPIResponse('fetchPageContent', 'LOCAL', null, error);
        return { success: false, error: 'Page not found locally' };
      }
    }

    // PRODUCTION MODE: Fetch from GitHub
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${PAGES_PATH}/${filename}`;
    
    logAPICall({
      function: 'fetchPageContent',
      mode: 'GITHUB_API',
      params: { slug, filename, owner, repo },
      url: apiUrl,
      method: 'GET'
    });

    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        logAPIResponse('fetchPageContent', 'GITHUB_API', null, 'Page not found (404)');
        return { success: false, error: 'Page not found' };
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch page content');
    }

    const data: GitHubFileResponse = await response.json();
    
    if (!data.content) {
      throw new Error('No content in response');
    }

    // Decode base64 content
    const decodedContent = atob(data.content);
    const jsonContent = JSON.parse(decodedContent);

    logAPIResponse('fetchPageContent', 'GITHUB_API', { 
      slug,
      title: jsonContent.title,
      sections: jsonContent.sections?.length || 0,
      sha: data.sha.substring(0, 7),
      size: data.size
    });
    return { 
      success: true, 
      content: jsonContent,
      sha: data.sha 
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Delete a page file from GitHub
 */
export async function deletePageFile(
  slug: string,
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const filename = `${slug}.json`;
    const path = `${PAGES_PATH}/${filename}`;

    // DEV MODE: Delete from local filesystem via API endpoint (unless forced to use GitHub API)
    if (import.meta.env.DEV && !forceGitHubAPI) {
      logAPICall({
        function: 'deletePageFile',
        mode: 'LOCAL',
        params: { slug, path },
        url: '/api/delete-page',
        method: 'POST'
      });

      const response = await fetch('/api/delete-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        logAPIResponse('deletePageFile', 'LOCAL', null, `Server error: ${response.status}. Response: ${text}`);
        return { 
          success: false, 
          error: `Server error: ${response.status}. Check dev server console for details.` 
        };
      }
      
      if (!response.ok) {
        logAPIResponse('deletePageFile', 'LOCAL', null, result.error || 'Server returned error');
        return { success: false, error: result.error || 'Failed to delete file locally' };
      }

      logAPIResponse('deletePageFile', 'LOCAL', { path, deleted: true });
      return { success: true };
    }

    // PRODUCTION MODE: Delete from GitHub
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    logAPICall({
      function: 'deletePageFile',
      mode: 'GITHUB_API',
      params: { slug, path, owner, repo },
      url: apiUrl,
      method: 'DELETE'
    });

    // First, get the file SHA (required for deletion)
    const getResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!getResponse.ok) {
      if (getResponse.status === 404) {
        logAPIResponse('deletePageFile', 'GITHUB_API', null, 'Page not found (404)');
        return { success: false, error: 'Page not found' };
      }
      const error = await getResponse.json();
      throw new Error(error.message || 'Failed to get page for deletion');
    }

    const fileData: GitHubFileResponse = await getResponse.json();

    // Delete the file
    const deleteResponse = await fetch(apiUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: `Delete page: ${slug}`,
        sha: fileData.sha,
        branch: 'main' // Always use main in production
      })
    });

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json();
      throw new Error(error.message || 'Failed to delete page');
    }

    logAPIResponse('deletePageFile', 'GITHUB_API', { path, deleted: true, sha: fileData.sha.substring(0, 7) });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Create or update a page file
 */
export async function savePageFile(
  slug: string,
  content: any,
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const filename = `${slug}.json`;
  const path = `${PAGES_PATH}/${filename}`;
  
  // Add updatedAt timestamp
  const contentWithTimestamp = {
    ...content,
    updatedAt: new Date().toISOString()
  };

  // DEV MODE: Save to local filesystem via API endpoint (unless forced to use GitHub API)
  if (import.meta.env.DEV && !forceGitHubAPI) {
    logAPICall({
      function: 'savePageFile',
      mode: 'LOCAL',
      params: { slug, path, title: content.title },
      url: '/api/save-page',
      method: 'POST'
    });

    try {
      const response = await fetch('/api/save-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content: contentWithTimestamp })
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        logAPIResponse('savePageFile', 'LOCAL', null, `Server error: ${response.status}. Response: ${text}`);
        return { 
          success: false, 
          error: `Server error: ${response.status}. Check dev server console for details.` 
        };
      }
      
      if (!response.ok) {
        logAPIResponse('savePageFile', 'LOCAL', null, result.error || 'Server returned error');
        return { success: false, error: result.error || 'Failed to save file locally' };
      }

      logAPIResponse('savePageFile', 'LOCAL', { path, success: true });
      return { success: true };
    } catch (error) {
      logAPIResponse('savePageFile', 'LOCAL', null, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save file locally'
      };
    }
  }

  // PRODUCTION MODE: Commit to GitHub
  const contentString = JSON.stringify(contentWithTimestamp, null, 2);
  const message = `Update page: ${content.title || slug}`;

  logAPICall({
    function: 'savePageFile (via commitToGitHub)',
    mode: 'GITHUB_API',
    params: { slug, path, title: content.title, message },
    url: `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    method: 'PUT'
  });

  const result = await commitToGitHub({
    token,
    owner,
    repo,
    path,
    content: contentString,
    message,
    branch: 'main' // Always use main in production
  });

  if (result.success) {
    logAPIResponse('savePageFile', 'GITHUB_API', { path, committed: true });
  } else {
    logAPIResponse('savePageFile', 'GITHUB_API', null, result.error);
  }

  return result;
}
