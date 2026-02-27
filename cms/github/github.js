const GITHUB_API = 'https://api.github.com';

/** Shared fetch helper with auth headers */
async function ghFetch(token, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`GitHub API error ${res.status} ${url}: ${err.message ?? ''}`);
  }
  return res.json();
}

/**
 * Returns the latest commit SHA and tree SHA for a branch.
 */
async function getBranchHead(token, repo, branch) {
  const data = await ghFetch(token, `${GITHUB_API}/repos/${repo}/git/ref/heads/${encodeURIComponent(branch)}`);
  const commitSha = data.object.sha;
  const commit = await ghFetch(token, `${GITHUB_API}/repos/${repo}/git/commits/${commitSha}`);
  return { commitSha, treeSha: commit.tree.sha };
}

/**
 * Creates a blob for a single file and returns its SHA.
 */
async function createBlob(token, repo, content) {
  const data = await ghFetch(token, `${GITHUB_API}/repos/${repo}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({ content: btoa(unescape(encodeURIComponent(content))), encoding: 'base64' }),
  });
  return data.sha;
}

/**
 * Commits one or more files to GitHub in a **single atomic commit** using the
 * Git Trees API. All files land in the same commit, regardless of quantity.
 *
 * @param {string} token   - GitHub PAT
 * @param {string} repo    - "owner/repo"
 * @param {string} branch  - target branch
 * @param {Array<{ path: string, content: string, message?: string }>} files
 * @param {string} [defaultMessage] - commit message (used unless each file overrides)
 * @returns {Promise<object>} GitHub API response for the updated ref
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

  // Use first file's message or the default
  const message = files[0]?.message ?? defaultMessage;

  // 1. Get branch HEAD
  const { commitSha, treeSha } = await getBranchHead(token, repo, branch);

  // 2. Create a blob for each file in parallel
  const treeItems = await Promise.all(
    files.map(async (file) => {
      const blobSha = await createBlob(token, repo, file.content);
      return { path: file.path, mode: '100644', type: 'blob', sha: blobSha };
    })
  );

  // 3. Create a new tree on top of the current one
  const newTree = await ghFetch(token, `${GITHUB_API}/repos/${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({ base_tree: treeSha, tree: treeItems }),
  });

  // 4. Create a new commit
  const newCommit = await ghFetch(token, `${GITHUB_API}/repos/${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({ message, tree: newTree.sha, parents: [commitSha] }),
  });

  // 5. Fast-forward the branch ref
  return ghFetch(token, `${GITHUB_API}/repos/${repo}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: newCommit.sha }),
  });
}
