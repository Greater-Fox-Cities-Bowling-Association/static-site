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
const LAYOUTS_PATH = 'src/content/layouts';
const THEMES_PATH = 'src/content/themes';

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
    console.log('🔍 fetchPagesDirectory called with:', { 
      owner, 
      repo, 
      forceGitHubAPI,
      isDev: import.meta.env.DEV,
      hasToken: !!token && token.length > 0
    });
    
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
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${PAGES_PATH}?ref=main`;
    
    logAPICall({
      function: 'fetchPagesDirectory',
      mode: 'GITHUB_API',
      params: { owner, repo, path: PAGES_PATH, ref: 'main' },
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
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      console.error('GitHub API Error Response:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        url: apiUrl
      });
      
      if (response.status === 404) {
        // Directory doesn't exist yet
        logAPIResponse('fetchPagesDirectory', 'GITHUB_API', { fileCount: 0, message: 'Directory not found (404), returning empty array' });
        return { success: true, files: [] };
      }
      
      throw new Error(errorData.message || `Failed to fetch pages directory (${response.status})`);
    }

    const data: GitHubFileResponse[] = await response.json();
    
    console.log('GitHub API Raw Response:', {
      totalFiles: data.length,
      files: data.map(f => ({ name: f.name, type: f.type }))
    });
    
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
    console.error('fetchPagesDirectory exception:', error);
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
        // Use import.meta.glob to load all pages at build time
        const pageModules = import.meta.glob('/src/content/pages/*.json', { eager: true });
        const pagePath = `/src/content/pages/${filename}`;
        const module = pageModules[pagePath] as any;
        
        if (!module) {
          logAPIResponse('fetchPageContent', 'LOCAL', null, `Page not found: ${pagePath}`);
          return { success: false, error: 'Page not found locally' };
        }
        
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
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${PAGES_PATH}/${filename}?ref=main`;
    
    logAPICall({
      function: 'fetchPageContent',
      mode: 'GITHUB_API',
      params: { slug, filename, owner, repo, ref: 'main' },
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
    const apiUrlWithRef = `${apiUrl}?ref=main`;
    
    logAPICall({
      function: 'deletePageFile',
      mode: 'GITHUB_API',
      params: { slug, path, owner, repo, ref: 'main' },
      url: apiUrl,
      method: 'DELETE'
    });

    // First, get the file SHA (required for deletion)
    const getResponse = await fetch(apiUrlWithRef, {
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

// =============================================================================
// Layout Management Functions
// =============================================================================

/**
 * Fetch all layouts from the layouts directory
 */
export async function fetchLayoutsDirectory(
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<{ success: boolean; files?: GitHubFileResponse[]; error?: string }> {
  try {
    // DEV MODE: Return local layouts (unless forced to use GitHub API)
    if (import.meta.env.DEV && !forceGitHubAPI) {
      logAPICall({
        function: 'fetchLayoutsDirectory',
        mode: 'LOCAL',
        params: { owner, repo, path: LAYOUTS_PATH }
      });

      try {
        const layoutModules = import.meta.glob('/src/content/layouts/*.json', { eager: true });
        const files: GitHubFileResponse[] = Object.entries(layoutModules).map(([path]) => {
          const filename = path.split('/').pop() || '';
          return {
            name: filename,
            path: `${LAYOUTS_PATH}/${filename}`,
            sha: '',
            size: 0,
            url: '',
            html_url: '',
            git_url: '',
            download_url: path,
            type: 'file' as const,
          };
        });

        logAPIResponse('fetchLayoutsDirectory', 'LOCAL', { 
          count: files.length,
          layouts: files.map(f => f.name)
        });
        return { success: true, files };
      } catch (error) {
        logAPIResponse('fetchLayoutsDirectory', 'LOCAL', null, error);
        return { success: true, files: [] }; // Return empty array if no layouts found
      }
    }

    // PRODUCTION MODE: Fetch from GitHub
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${LAYOUTS_PATH}?ref=main`;
    
    logAPICall({
      function: 'fetchLayoutsDirectory',
      mode: 'GITHUB_API',
      params: { owner, repo, path: LAYOUTS_PATH, ref: 'main' },
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
        logAPIResponse('fetchLayoutsDirectory', 'GITHUB_API', null, 'Layouts directory not found (404)');
        return { success: true, files: [] }; // Return empty array if directory doesn't exist
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch layouts directory');
    }

    const files: GitHubFileResponse[] = await response.json();
    const jsonFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.json'));

    logAPIResponse('fetchLayoutsDirectory', 'GITHUB_API', { 
      count: jsonFiles.length,
      layouts: jsonFiles.map(f => f.name)
    });
    return { 
      success: true, 
      files: jsonFiles 
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Fetch a specific layout by ID
 */
export async function fetchLayoutContent(
  layoutId: string,
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<{ success: boolean; content?: any; sha?: string; error?: string }> {
  try {
    const filename = `${layoutId}.json`;

    // DEV MODE: Read from local filesystem (unless forced to use GitHub API)
    if (import.meta.env.DEV && !forceGitHubAPI) {
      logAPICall({
        function: 'fetchLayoutContent',
        mode: 'LOCAL',
        params: { layoutId, filename }
      });

      try {
        const layoutModules = import.meta.glob('/src/content/layouts/*.json', { eager: true });
        const layoutPath = `/src/content/layouts/${filename}`;
        const module = layoutModules[layoutPath] as any;
        
        if (!module) {
          logAPIResponse('fetchLayoutContent', 'LOCAL', null, `Layout not found: ${layoutPath}`);
          return { success: false, error: 'Layout not found locally' };
        }
        
        const content = module.default;
        logAPIResponse('fetchLayoutContent', 'LOCAL', { 
          layoutId, 
          name: content.name
        });
        return {
          success: true,
          content,
          sha: ''
        };
      } catch (error) {
        logAPIResponse('fetchLayoutContent', 'LOCAL', null, error);
        return { success: false, error: 'Layout not found locally' };
      }
    }

    // PRODUCTION MODE: Fetch from GitHub
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${LAYOUTS_PATH}/${filename}?ref=main`;
    
    logAPICall({
      function: 'fetchLayoutContent',
      mode: 'GITHUB_API',
      params: { layoutId, filename, owner, repo, ref: 'main' },
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
        logAPIResponse('fetchLayoutContent', 'GITHUB_API', null, 'Layout not found (404)');
        return { success: false, error: 'Layout not found' };
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch layout content');
    }

    const data: GitHubFileResponse = await response.json();
    
    if (!data.content) {
      throw new Error('No content in response');
    }

    const decodedContent = atob(data.content);
    const jsonContent = JSON.parse(decodedContent);

    logAPIResponse('fetchLayoutContent', 'GITHUB_API', { 
      layoutId,
      name: jsonContent.name,
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
 * Save a layout file
 */
export async function saveLayoutFile(
  layoutId: string,
  content: any,
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const filename = `${layoutId}.json`;
  const path = `${LAYOUTS_PATH}/${filename}`;
  
  const contentWithTimestamp = {
    ...content,
    updatedAt: new Date().toISOString()
  };

  // DEV MODE: Save to local filesystem via API endpoint
  if (import.meta.env.DEV && !forceGitHubAPI) {
    logAPICall({
      function: 'saveLayoutFile',
      mode: 'LOCAL',
      params: { layoutId, path, name: content.name },
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
        logAPIResponse('saveLayoutFile', 'LOCAL', null, `Server error: ${response.status}. Response: ${text}`);
        return { 
          success: false, 
          error: `Server error: ${response.status}. Check dev server console for details.` 
        };
      }
      
      if (!response.ok) {
        logAPIResponse('saveLayoutFile', 'LOCAL', null, result.error || 'Server returned error');
        return { success: false, error: result.error || 'Failed to save file locally' };
      }

      logAPIResponse('saveLayoutFile', 'LOCAL', { path, success: true });
      return { success: true };
    } catch (error) {
      logAPIResponse('saveLayoutFile', 'LOCAL', null, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save file locally'
      };
    }
  }

  // PRODUCTION MODE: Commit to GitHub
  const contentString = JSON.stringify(contentWithTimestamp, null, 2);
  const message = `Update layout: ${content.name || layoutId}`;

  logAPICall({
    function: 'saveLayoutFile (via commitToGitHub)',
    mode: 'GITHUB_API',
    params: { layoutId, path, name: content.name, message },
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
    branch: 'main'
  });

  if (result.success) {
    logAPIResponse('saveLayoutFile', 'GITHUB_API', { path, committed: true });
  } else {
    logAPIResponse('saveLayoutFile', 'GITHUB_API', null, result.error);
  }

  return result;
}

/**
 * Delete a layout file
 */
export async function deleteLayoutFile(
  layoutId: string,
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const filename = `${layoutId}.json`;
    const path = `${LAYOUTS_PATH}/${filename}`;

    // DEV MODE: Delete from local filesystem via API endpoint
    if (import.meta.env.DEV && !forceGitHubAPI) {
      logAPICall({
        function: 'deleteLayoutFile',
        mode: 'LOCAL',
        params: { layoutId, path },
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
        logAPIResponse('deleteLayoutFile', 'LOCAL', null, `Server error: ${response.status}. Response: ${text}`);
        return { 
          success: false, 
          error: `Server error: ${response.status}. Check dev server console for details.` 
        };
      }
      
      if (!response.ok) {
        logAPIResponse('deleteLayoutFile', 'LOCAL', null, result.error || 'Server returned error');
        return { success: false, error: result.error || 'Failed to delete file locally' };
      }

      logAPIResponse('deleteLayoutFile', 'LOCAL', { path, deleted: true });
      return { success: true };
    }

    // PRODUCTION MODE: Delete from GitHub
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const apiUrlWithRef = `${apiUrl}?ref=main`;
    
    logAPICall({
      function: 'deleteLayoutFile',
      mode: 'GITHUB_API',
      params: { layoutId, path, owner, repo, ref: 'main' },
      url: apiUrl,
      method: 'DELETE'
    });

    // First, get the file SHA (required for deletion)
    const getResponse = await fetch(apiUrlWithRef, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!getResponse.ok) {
      if (getResponse.status === 404) {
        logAPIResponse('deleteLayoutFile', 'GITHUB_API', null, 'Layout not found (404)');
        return { success: false, error: 'Layout not found' };
      }
      const error = await getResponse.json();
      throw new Error(error.message || 'Failed to get layout for deletion');
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
        message: `Delete layout: ${layoutId}`,
        sha: fileData.sha,
        branch: 'main'
      })
    });

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json();
      throw new Error(error.message || 'Failed to delete layout');
    }

    logAPIResponse('deleteLayoutFile', 'GITHUB_API', { path, deleted: true, sha: fileData.sha.substring(0, 7) });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// =============================================================================
// Theme Management API Functions
// =============================================================================

/**
 * Fetch all themes from the repository
 */
export async function fetchThemesDirectory(
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<{ success: boolean; files?: GitHubFileResponse[]; error?: string }> {
  try {
    // DEV MODE: Fetch from dev server (unless forced to use GitHub API)
    if (import.meta.env.DEV && !forceGitHubAPI) {
      logAPICall({
        function: 'fetchThemesDirectory',
        mode: 'LOCAL',
        params: { owner, repo, path: THEMES_PATH }
      });

      try {
        // Fetch the themes via the Vite dev server's directory listing
        // Note: This uses the glob pattern but with a cache-buster to ensure fresh data
        const themeModules = import.meta.glob('/src/content/themes/*.json', { eager: true });
        const files: GitHubFileResponse[] = Object.entries(themeModules).map(([path]) => {
          const filename = path.split('/').pop() || '';
          return {
            name: filename,
            path: `${THEMES_PATH}/${filename}`,
            sha: '',
            size: 0,
            url: '',
            html_url: '',
            git_url: '',
            download_url: path,
            type: 'file' as const,
          };
        });

        // Also fetch each theme directly to ensure we have the latest content
        // This validates that files actually exist on disk
        const validFiles: GitHubFileResponse[] = [];
        for (const file of files) {
          try {
            const response = await fetch(`/src/content/themes/${file.name}`);
            if (response.ok) {
              validFiles.push(file);
            }
          } catch (e) {
            // File doesn't exist, skip it
          }
        }

        logAPIResponse('fetchThemesDirectory', 'LOCAL', { 
          count: validFiles.length,
          themes: validFiles.map(f => f.name)
        });
        return { success: true, files: validFiles };
      } catch (error) {
        logAPIResponse('fetchThemesDirectory', 'LOCAL', null, error);
        return { success: true, files: [] }; // Return empty array if no themes found
      }
    }

    // PRODUCTION MODE: Fetch from GitHub
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${THEMES_PATH}?ref=main`;
    
    logAPICall({
      function: 'fetchThemesDirectory',
      mode: 'GITHUB_API',
      params: { owner, repo, path: THEMES_PATH, ref: 'main' },
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
        logAPIResponse('fetchThemesDirectory', 'GITHUB_API', null, 'Themes directory not found (404)');
        return { success: true, files: [] }; // Return empty array if directory doesn't exist
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch themes directory');
    }

    const files: GitHubFileResponse[] = await response.json();
    const jsonFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.json'));

    logAPIResponse('fetchThemesDirectory', 'GITHUB_API', { 
      count: jsonFiles.length,
      themes: jsonFiles.map(f => f.name)
    });
    return { 
      success: true, 
      files: jsonFiles 
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Fetch a specific theme by ID
 */
export async function fetchThemeContent(
  themeId: string,
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<any> {
  try {
    const filename = `${themeId}.json`;

    // DEV MODE: Fetch from dev server (unless forced to use GitHub API)
    if (import.meta.env.DEV && !forceGitHubAPI) {
      logAPICall({
        function: 'fetchThemeContent',
        mode: 'LOCAL',
        params: { themeId, filename }
      });

      try {
        // Fetch directly from the dev server instead of using import.meta.glob cache
        // This ensures we get the latest file content from disk
        const response = await fetch(`/src/content/themes/${filename}`);
        if (!response.ok) {
          logAPIResponse('fetchThemeContent', 'LOCAL', null, `Theme not found: ${filename}`);
          throw new Error('Theme not found locally');
        }
        
        const content = await response.json();
        logAPIResponse('fetchThemeContent', 'LOCAL', { 
          themeId, 
          name: content.name
        });
        return content;
      } catch (error) {
        logAPIResponse('fetchThemeContent', 'LOCAL', null, error);
        throw new Error('Theme not found locally');
      }
    }

    // PRODUCTION MODE: Fetch from GitHub
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${THEMES_PATH}/${filename}?ref=main`;
    
    logAPICall({
      function: 'fetchThemeContent',
      mode: 'GITHUB_API',
      params: { themeId, filename, owner, repo, ref: 'main' },
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
        logAPIResponse('fetchThemeContent', 'GITHUB_API', null, 'Theme not found (404)');
        throw new Error('Theme not found');
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch theme content');
    }

    const data: GitHubFileResponse = await response.json();
    
    if (!data.content) {
      throw new Error('No content in response');
    }

    const decodedContent = atob(data.content);
    const jsonContent = JSON.parse(decodedContent);

    logAPIResponse('fetchThemeContent', 'GITHUB_API', { 
      themeId,
      name: jsonContent.name,
      sha: data.sha.substring(0, 7),
      size: data.size
    });
    return jsonContent;
  } catch (error) {
    throw error instanceof Error ? error : new Error('Unknown error occurred');
  }
}

/**
 * Save a theme file
 */
export async function saveThemeFile(
  theme: any,
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const filename = `${theme.id}.json`;
  const path = `${THEMES_PATH}/${filename}`;
  
  const contentWithTimestamp = {
    ...theme,
    updatedAt: new Date().toISOString()
  };

  // DEV MODE: Save to local filesystem via API endpoint
  if (import.meta.env.DEV && !forceGitHubAPI) {
    logAPICall({
      function: 'saveThemeFile',
      mode: 'LOCAL',
      params: { themeId: theme.id, path, name: theme.name },
      url: '/api/save-page',
      method: 'POST'
    });

    try {
      const requestBody = JSON.stringify({ path, content: contentWithTimestamp });
      console.log('📤 Sending request to /api/save-page');
      console.log('📤 Request body length:', requestBody.length);
      console.log('📤 Request body:', requestBody.substring(0, 500));
      
      const response = await fetch('/api/save-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: requestBody
      });

      let result;
      try {
        result = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        console.error('❌ Failed to parse JSON response:', jsonError);
        console.error('Response status:', response.status);
        console.error('Response text:', text);
        logAPIResponse('saveThemeFile', 'LOCAL', null, `Server error: ${response.status}. Response: ${text}`);
        return { 
          success: false, 
          error: `Server error: ${response.status}. Check dev server console for details.` 
        };
      }
      
      if (!response.ok) {
        console.error('❌ API returned error:', result.error);
        logAPIResponse('saveThemeFile', 'LOCAL', null, result.error || 'Server returned error');
        return { success: false, error: result.error || 'Failed to save file locally' };
      }

      console.log('✅ Theme file saved:', path);
      logAPIResponse('saveThemeFile', 'LOCAL', { path, success: true });
      return { success: true };
    } catch (error) {
      console.error('❌ Fetch error while saving theme:', error);
      logAPIResponse('saveThemeFile', 'LOCAL', null, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save file locally'
      };
    }
  }

  // PRODUCTION MODE: Commit to GitHub
  const contentString = JSON.stringify(contentWithTimestamp, null, 2);
  const message = `Update theme: ${theme.name || theme.id}`;

  logAPICall({
    function: 'saveThemeFile (via commitToGitHub)',
    mode: 'GITHUB_API',
    params: { themeId: theme.id, path, name: theme.name, message },
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
    branch: 'main'
  });

  if (result.success) {
    logAPIResponse('saveThemeFile', 'GITHUB_API', { path, committed: true });
  } else {
    logAPIResponse('saveThemeFile', 'GITHUB_API', null, result.error);
  }

  return result;
}

/**
 * Delete a theme file
 */
export async function deleteThemeFile(
  themeId: string,
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    const filename = `${themeId}.json`;
    const path = `${THEMES_PATH}/${filename}`;

    // DEV MODE: Delete from local filesystem via API endpoint
    if (import.meta.env.DEV && !forceGitHubAPI) {
      logAPICall({
        function: 'deleteThemeFile',
        mode: 'LOCAL',
        params: { themeId, path },
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
        logAPIResponse('deleteThemeFile', 'LOCAL', null, `Server error: ${response.status}. Response: ${text}`);
        return { 
          success: false, 
          error: `Server error: ${response.status}. Check dev server console for details.` 
        };
      }
      
      if (!response.ok) {
        logAPIResponse('deleteThemeFile', 'LOCAL', null, result.error || 'Server returned error');
        return { success: false, error: result.error || 'Failed to delete file locally' };
      }

      logAPIResponse('deleteThemeFile', 'LOCAL', { path, deleted: true });
      return { success: true };
    }

    // PRODUCTION MODE: Delete from GitHub
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    const apiUrlWithRef = `${apiUrl}?ref=main`;
    
    logAPICall({
      function: 'deleteThemeFile',
      mode: 'GITHUB_API',
      params: { themeId, path, owner, repo, ref: 'main' },
      url: apiUrl,
      method: 'DELETE'
    });

    // First, get the file SHA (required for deletion)
    const getResponse = await fetch(apiUrlWithRef, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!getResponse.ok) {
      if (getResponse.status === 404) {
        logAPIResponse('deleteThemeFile', 'GITHUB_API', null, 'Theme not found (404)');
        return { success: false, error: 'Theme not found' };
      }
      const error = await getResponse.json();
      throw new Error(error.message || 'Failed to get theme for deletion');
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
        message: `Delete theme: ${themeId}`,
        sha: fileData.sha,
        branch: 'main'
      })
    });

    if (!deleteResponse.ok) {
      const error = await deleteResponse.json();
      throw new Error(error.message || 'Failed to delete theme');
    }

    logAPIResponse('deleteThemeFile', 'GITHUB_API', { path, deleted: true, sha: fileData.sha.substring(0, 7) });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Activate a theme (set isActive to true and deactivate others)
 */
export async function activateTheme(
  themeId: string,
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🎨 Starting theme activation for:', themeId);
    
    // First, fetch all themes
    const allThemesResult = await fetchThemesDirectory(token, owner, repo, forceGitHubAPI);
    
    if (!allThemesResult.success || !allThemesResult.files) {
      console.error('❌ Failed to fetch themes directory');
      return { success: false, error: 'Failed to fetch themes directory' };
    }

    console.log('📋 Found themes:', allThemesResult.files.map(f => f.name));

    // Fetch each theme and update their isActive status
    const themeFiles = allThemesResult.files.filter(f => f.name.endsWith('.json'));
    const themeIdToActivate = themeId;

    for (const file of themeFiles) {
      const currentThemeId = file.name.replace('.json', '');
      console.log(`📖 Processing theme: ${currentThemeId}`);
      
      const theme = await fetchThemeContent(currentThemeId, token, owner, repo, forceGitHubAPI);
      
      // Update isActive status
      const updatedTheme = {
        ...theme,
        isActive: currentThemeId === themeIdToActivate
      };

      console.log(`💾 Saving ${currentThemeId} with isActive=${updatedTheme.isActive}`);

      // Save the updated theme
      const saveResult = await saveThemeFile(updatedTheme, token, owner, repo, forceGitHubAPI);
      
      if (!saveResult.success) {
        console.error(`❌ Failed to save theme ${currentThemeId}:`, saveResult.error);
        return { success: false, error: `Failed to update theme ${currentThemeId}` };
      }
      console.log(`✅ Successfully saved ${currentThemeId}`);
    }

    // Clear the cached theme from sessionStorage to force reload
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('active-theme');
    }

    logAPIResponse('activateTheme', forceGitHubAPI ? 'GITHUB_API' : 'LOCAL', { 
      activatedTheme: themeIdToActivate
    });
    
    console.log('✅ Theme activation complete, ready to reload');
    // Note: Don't reload the page here - let the caller handle refreshing the UI
    // The component will call loadThemes() to refresh the theme list
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error in activateTheme:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// =============================================================================
// Navigation Management Functions
// =============================================================================

const NAVIGATION_PATH = 'src/content/navigation';

/**
 * Fetch all navigation menus from the repository
 */
export async function fetchNavigationDirectory(
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<{ success: boolean; files?: GitHubFileResponse[]; error?: string }> {
  try {
    // DEV MODE: Return local navigation menus (unless forced to use GitHub API)
    if (import.meta.env.DEV && !forceGitHubAPI) {
      logAPICall({
        function: 'fetchNavigationDirectory',
        mode: 'LOCAL',
        params: { owner, repo, path: NAVIGATION_PATH }
      });

      try {
        const navModules = import.meta.glob('/src/content/navigation/*.json', { eager: true });
        const files: GitHubFileResponse[] = Object.entries(navModules).map(([path]) => {
          const filename = path.split('/').pop() || '';
          return {
            name: filename,
            path: `${NAVIGATION_PATH}/${filename}`,
            sha: '',
            size: 0,
            url: '',
            html_url: '',
            git_url: '',
            download_url: path,
            type: 'file' as const,
          };
        });

        logAPIResponse('fetchNavigationDirectory', 'LOCAL', { 
          count: files.length,
          navigation: files.map(f => f.name)
        });
        return { success: true, files };
      } catch (error) {
        logAPIResponse('fetchNavigationDirectory', 'LOCAL', null, error);
        return { success: true, files: [] }; // Return empty array if no navigation found
      }
    }

    // PRODUCTION MODE: Fetch from GitHub
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${NAVIGATION_PATH}?ref=main`;
    
    logAPICall({
      function: 'fetchNavigationDirectory',
      mode: 'GITHUB_API',
      params: { owner, repo, path: NAVIGATION_PATH, ref: 'main' },
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
        logAPIResponse('fetchNavigationDirectory', 'GITHUB_API', null, 'Navigation directory not found (404)');
        return { success: true, files: [] }; // Return empty array if directory doesn't exist
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch navigation directory');
    }

    const files: GitHubFileResponse[] = await response.json();
    const jsonFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.json'));

    logAPIResponse('fetchNavigationDirectory', 'GITHUB_API', { 
      count: jsonFiles.length,
      navigation: jsonFiles.map(f => f.name)
    });
    return { 
      success: true, 
      files: jsonFiles 
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// =============================================================================
// Collection Management Functions
// =============================================================================

/**
 * Get all collections with metadata
 */
export async function getCollections(
  token: string,
  forceGitHubAPI: boolean = false
): Promise<any[]> {
  logAPICall({
    function: 'getCollections',
    mode: forceGitHubAPI ? 'GITHUB_API' : 'LOCAL',
    params: { forceGitHubAPI },
  });

  try {
    // In Astro, we read from the content config
    if (!forceGitHubAPI && typeof import.meta !== 'undefined' && import.meta.env.DEV) {
      // Dev mode - read from local filesystem
      const collections = await import('../content/config.ts');
      const collectionInfo = [];

      for (const [name, _collection] of Object.entries(collections.collections)) {
        try {
          // Try to get items from each collection
          const items = await import.meta.glob('../content/**/*.json');
          const collectionPath = `../content/${name}/`;
          const collectionFiles = Object.keys(items).filter(path => path.includes(collectionPath));
          
          collectionInfo.push({
            name,
            itemCount: collectionFiles.length,
            fields: [], // TODO: Extract from schema
            description: `${name} collection`,
          });
        } catch (err) {
          console.warn(`Could not load items for collection ${name}:`, err);
          collectionInfo.push({
            name,
            itemCount: 0,
            fields: [],
            description: `${name} collection`,
          });
        }
      }

      logAPIResponse('getCollections', 'LOCAL', collectionInfo);
      return collectionInfo;
    }

    // Production or forced GitHub API mode
    // We need to list directories in src/content/
    const response = await fetch(
      `https://api.github.com/repos/${DEFAULT_OWNER}/${DEFAULT_REPO}/contents/src/content`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const contents = await response.json() as GitHubFileResponse[];
    const collections = contents.filter((item) => item.type === 'dir' && item.name !== 'config.ts');

    const collectionInfo = await Promise.all(
      collections.map(async (coll) => {
        // Get files in each collection
        const collResponse = await fetch(coll.url, {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });
        
        const collFiles = await collResponse.json() as GitHubFileResponse[];
        const jsonFiles = collFiles.filter(f => f.name.endsWith('.json'));

        return {
          name: coll.name,
          itemCount: jsonFiles.length,
          fields: [],
          description: `${coll.name} collection`,
        };
      })
    );

    logAPIResponse('getCollections', 'GITHUB_API', collectionInfo);
    return collectionInfo;
  } catch (error) {
    logAPIResponse('getCollections', forceGitHubAPI ? 'GITHUB_API' : 'LOCAL', null, error);
    throw error;
  }
}

/**
 * Get a specific collection schema
 */
export async function getCollection(
  collectionName: string,
  token: string,
  forceGitHubAPI: boolean = false
): Promise<any> {
  logAPICall({
    function: 'getCollection',
    mode: forceGitHubAPI ? 'GITHUB_API' : 'LOCAL',
    params: { collectionName, forceGitHubAPI },
  });

  try {
    // Read the config.ts file and parse the collection schema
    // This is a simplified approach - real implementation would parse the actual schema
    const schema = {
      name: collectionName,
      description: `${collectionName} collection`,
      fields: [
        { name: 'title', type: 'string', required: true, description: 'Title' },
        { name: 'description', type: 'string', required: false, description: 'Description' },
      ],
    };

    logAPIResponse('getCollection', forceGitHubAPI ? 'GITHUB_API' : 'LOCAL', schema);
    return schema;
  } catch (error) {
    logAPIResponse('getCollection', forceGitHubAPI ? 'GITHUB_API' : 'LOCAL', null, error);
    throw error;
  }
}

/**
 * Save a collection schema
 */
export async function saveCollection(
  schema: any,
  token: string,
  forceGitHubAPI: boolean = false
): Promise<void> {
  logAPICall({
    function: 'saveCollection',
    mode: forceGitHubAPI ? 'GITHUB_API' : 'LOCAL',
    params: { schema, forceGitHubAPI },
  });

  try {
    // This would update the config.ts file with the new collection schema
    // For now, we'll just log it as this requires parsing and modifying TypeScript code
    console.warn('Collection schema saving not yet implemented');
    console.log('Would save schema:', schema);

    // TODO: Implement actual schema saving
    // This would involve:
    // 1. Reading src/content/config.ts
    // 2. Parsing the TypeScript AST
    // 3. Adding/updating the collection definition
    // 4. Writing back the modified file via GitHub API

    logAPIResponse('saveCollection', forceGitHubAPI ? 'GITHUB_API' : 'LOCAL', { saved: true });
  } catch (error) {
    logAPIResponse('saveCollection', forceGitHubAPI ? 'GITHUB_API' : 'LOCAL', null, error);
    throw error;
  }
}

// =============================================================================
// Component Management Functions
// =============================================================================

const PRIMITIVES_PATH = 'src/content/components/primitives';
const COMPOSITES_PATH = 'src/content/components/composites';

/**
 * Fetch all primitive components
 */
export async function fetchPrimitiveComponents(
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<any[]> {
  logAPICall({
    function: 'fetchPrimitiveComponents',
    mode: forceGitHubAPI ? 'GITHUB_API' : 'LOCAL',
    params: { owner, repo, path: PRIMITIVES_PATH },
  });

  try {
    // DEV MODE: Load from local filesystem (unless forced to use GitHub API)
    if (import.meta.env.DEV && !forceGitHubAPI) {
      // Use fetch to load JSON files locally
      const primitiveIds = [
        'text', 'image', 'button', 'list', 'table', 
        'section', 'checkbox', 'radiobutton', 'link', 
        'spacer', 'divider'
      ];
      
      const components = await Promise.all(
        primitiveIds.map(async (id) => {
          try {
            const response = await fetch(`/src/content/components/primitives/${id}.json`);
            if (response.ok) {
              return await response.json();
            }
            return null;
          } catch (err) {
            console.warn(`Could not load primitive component: ${id}`);
            return null;
          }
        })
      );
      
      const validComponents = components.filter(c => c !== null);
      logAPIResponse('fetchPrimitiveComponents', 'LOCAL', { count: validComponents.length });
      return validComponents;
    }

    // PRODUCTION MODE: Fetch from GitHub
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${PRIMITIVES_PATH}`;
    logAPICall({
      function: 'fetchPrimitiveComponents (via GitHub API)',
      mode: 'GITHUB_API',
      params: { owner, repo, path: PRIMITIVES_PATH },
      url,
      method: 'GET'
    });

    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const files: GitHubFileResponse[] = await response.json();
    const components = await Promise.all(
      files
        .filter(f => f.type === 'file' && f.name.endsWith('.json'))
        .map(async (file) => {
          const fileResponse = await fetch(file.download_url!, {
            headers: {
              'Authorization': `token ${token}`
            }
          });
          return fileResponse.json();
        })
    );

    logAPIResponse('fetchPrimitiveComponents', 'GITHUB_API', { count: components.length });
    return components;
  } catch (error) {
    logAPIResponse('fetchPrimitiveComponents', forceGitHubAPI ? 'GITHUB_API' : 'LOCAL', null, error);
    throw error;
  }
}

/**
 * Fetch all composite components
 */
export async function fetchCompositeComponents(
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<any[]> {
  logAPICall({
    function: 'fetchCompositeComponents',
    mode: forceGitHubAPI ? 'GITHUB_API' : 'LOCAL',
    params: { owner, repo, path: COMPOSITES_PATH },
  });

  try {
    // DEV MODE: Load from local filesystem (unless forced to use GitHub API)
    if (import.meta.env.DEV && !forceGitHubAPI) {
      // Use fetch to load JSON files locally
      const compositeIds = [
        'hero', 'text-block', 'card-grid', 'cta', 'content-list',
        'location-card', 'tournament-card'
      ];
      
      const components = await Promise.all(
        compositeIds.map(async (id) => {
          try {
            const response = await fetch(`/src/content/components/composites/${id}.json`);
            if (response.ok) {
              return await response.json();
            }
            return null;
          } catch (err) {
            console.warn(`Could not load composite component: ${id}`);
            return null;
          }
        })
      );
      
      const validComponents = components.filter(c => c !== null);
      logAPIResponse('fetchCompositeComponents', 'LOCAL', { count: validComponents.length });
      return validComponents;
    }

    // PRODUCTION MODE: Fetch from GitHub
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${COMPOSITES_PATH}`;
    logAPICall({
      function: 'fetchCompositeComponents (via GitHub API)',
      mode: 'GITHUB_API',
      params: { owner, repo, path: COMPOSITES_PATH },
      url,
      method: 'GET'
    });

    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const files: GitHubFileResponse[] = await response.json();
    const components = await Promise.all(
      files
        .filter(f => f.type === 'file' && f.name.endsWith('.json'))
        .map(async (file) => {
          const fileResponse = await fetch(file.download_url!, {
            headers: {
              'Authorization': `token ${token}`
            }
          });
          return fileResponse.json();
        })
    );

    logAPIResponse('fetchCompositeComponents', 'GITHUB_API', { count: components.length });
    return components;
  } catch (error) {
    logAPIResponse('fetchCompositeComponents', forceGitHubAPI ? 'GITHUB_API' : 'LOCAL', null, error);
    throw error;
  }
}

/**
 * Save a component (primitive or composite)
 */
export async function saveComponent(
  component: any,
  token: string,
  owner: string = DEFAULT_OWNER,
  repo: string = DEFAULT_REPO,
  forceGitHubAPI: boolean = false
): Promise<{ success: boolean; error?: string }> {
  const isComposite = component.type === 'composite';
  const basePath = isComposite ? COMPOSITES_PATH : PRIMITIVES_PATH;
  const filename = `${component.id}.json`;
  const path = `${basePath}/${filename}`;
  
  logAPICall({
    function: 'saveComponent',
    mode: forceGitHubAPI ? 'GITHUB_API' : 'LOCAL',
    params: { componentId: component.id, type: component.type, path },
  });

  // DEV MODE: Save via local API endpoint (unless forced to use GitHub API)
  if (import.meta.env.DEV && !forceGitHubAPI) {
    try {
      const response = await fetch('/api/save-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content: component })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save component');
      }

      logAPIResponse('saveComponent', 'LOCAL', { path, success: true });
      return { success: true };
    } catch (error) {
      logAPIResponse('saveComponent', 'LOCAL', null, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save component'
      };
    }
  }

  // PRODUCTION MODE: Commit to GitHub
  const contentString = JSON.stringify(component, null, 2);
  const message = `Update component: ${component.name}`;

  const result = await commitToGitHub({
    token,
    owner,
    repo,
    path,
    content: contentString,
    message,
    branch: 'main'
  });

  if (result.success) {
    logAPIResponse('saveComponent', 'GITHUB_API', { path, committed: true });
  } else {
    logAPIResponse('saveComponent', 'GITHUB_API', null, result.error);
  }

  return result;
}
