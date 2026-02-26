const GITHUB_API = 'https://api.github.com';

/**
 * Fetches the current SHA of a file at `path` in the given repo/branch.
 * Returns null if the file does not exist yet.
 *
 * @param {string} token  - GitHub personal access token
 * @param {string} repo   - e.g. "owner/repo"
 * @param {string} branch - e.g. "main"
 * @param {string} path   - file path within the repo
 * @returns {Promise<string|null>}
 */
async function getFileSha(token, repo, branch, path) {
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}?ref=${branch}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub API error ${res.status} fetching SHA for ${path}`);
  const data = await res.json();
  return data.sha ?? null;
}

/**
 * Commits a single file to GitHub via the Contents API.
 *
 * @param {string} token   - GitHub PAT
 * @param {string} repo    - "owner/repo"
 * @param {string} branch  - target branch
 * @param {string} path    - file path in the repo
 * @param {string} content - raw file content (will be base64-encoded)
 * @param {string} message - commit message
 * @returns {Promise<object>} GitHub API response
 */
async function commitSingleFile(token, repo, branch, path, content, message) {
  const sha = await getFileSha(token, repo, branch, path);

  const body = {
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch,
    ...(sha ? { sha } : {}),
  };

  const url = `${GITHUB_API}/repos/${repo}/contents/${path}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub commit failed for ${path}: ${res.status} ${err.message ?? ''}`);
  }

  return res.json();
}

/**
 * Commits one or more files to GitHub.
 *
 * Each call creates a separate commit per file. For a true multi-file atomic
 * commit use the Git Trees API (Phase 2 enhancement).
 *
 * @param {string} token   - GitHub PAT
 * @param {string} repo    - "owner/repo"
 * @param {string} branch  - target branch
 * @param {Array<{ path: string, content: string, message?: string }>} files
 * @param {string} [defaultMessage] - fallback commit message
 * @returns {Promise<object[]>} array of GitHub API responses
 */
export async function commitFiles(
  token,
  repo,
  branch,
  files,
  defaultMessage = 'chore: update content via admin'
) {
  if (!token) throw new Error('GitHub token is required to commit files.');
  if (!files || files.length === 0) throw new Error('No files provided to commit.');

  const results = [];
  for (const file of files) {
    const message = file.message ?? defaultMessage;
    const result = await commitSingleFile(token, repo, branch, file.path, file.content, message);
    results.push(result);
  }
  return results;
}
