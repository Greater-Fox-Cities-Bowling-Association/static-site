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

const DEFAULT_OWNER = 'myoung-admin';
const DEFAULT_REPO = 'gfcba';
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
  repo: string = DEFAULT_REPO
): Promise<{ success: boolean; files?: GitHubFileResponse[]; error?: string }> {
  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${PAGES_PATH}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Directory doesn't exist yet
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
  repo: string = DEFAULT_REPO
): Promise<{ success: boolean; content?: any; sha?: string; error?: string }> {
  try {
    const filename = `${slug}.json`;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${PAGES_PATH}/${filename}`;
    
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
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
  repo: string = DEFAULT_REPO
): Promise<{ success: boolean; error?: string }> {
  try {
    const filename = `${slug}.json`;
    const path = `${PAGES_PATH}/${filename}`;

    console.log('🗑️ deletePageFile:', { slug, path, mode: import.meta.env.DEV ? 'DEV (local)' : 'PRODUCTION (GitHub)' });

    // DEV MODE: Delete from local filesystem via API endpoint
    if (import.meta.env.DEV) {
      const response = await fetch('/api/delete-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to delete file locally' };
      }

      console.log('✅ Deleted local file:', path);
      return { success: true };
    }

    // PRODUCTION MODE: Delete from GitHub
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    // First, get the file SHA (required for deletion)
    const getResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!getResponse.ok) {
      if (getResponse.status === 404) {
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
  repo: string = DEFAULT_REPO
): Promise<{ success: boolean; error?: string }> {
  const filename = `${slug}.json`;
  const path = `${PAGES_PATH}/${filename}`;
  
  // Add updatedAt timestamp
  const contentWithTimestamp = {
    ...content,
    updatedAt: new Date().toISOString()
  };
  
  console.log('💾 savePageFile:', { slug, path, title: content.title, mode: import.meta.env.DEV ? 'DEV (local)' : 'PRODUCTION (GitHub)' });

  // DEV MODE: Save to local filesystem via API endpoint
  if (import.meta.env.DEV) {
    try {
      const response = await fetch('/api/save-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content: contentWithTimestamp })
      });

      const result = await response.json();
      
      if (!response.ok) {
        return { success: false, error: result.error || 'Failed to save file locally' };
      }

      console.log('✅ Saved to local file:', path);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save file locally'
      };
    }
  }

  // PRODUCTION MODE: Commit to GitHub
  const contentString = JSON.stringify(contentWithTimestamp, null, 2);
  const message = `Update page: ${content.title || slug}`;

  return commitToGitHub({
    token,
    owner,
    repo,
    path,
    content: contentString,
    message,
    branch: 'main' // Always use main in production
  });
}
