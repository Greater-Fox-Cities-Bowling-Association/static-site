interface GitHubCommitOptions {
  token: string;
  owner: string;
  repo: string;
  path: string;
  content: string;
  message: string;
  branch?: string;
}

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
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    // Check if file exists to get SHA
    let sha: string | undefined;
    try {
      const existingFile = await fetch(apiUrl, {
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
      const error = await response.json();
      throw new Error(error.message || 'Failed to commit to GitHub');
    }

    return { success: true };
  } catch (error) {
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
