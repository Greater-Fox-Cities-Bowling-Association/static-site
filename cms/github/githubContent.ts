/**
 * githubContent.ts
 * Browser-side helpers for reading files and directory listings from GitHub.
 */

const GITHUB_API = 'https://api.github.com';

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir';
  download_url: string | null;
}

/**
 * Lists files in a directory in the GitHub repo.
 */
export async function listDirectory(
  token: string,
  repo: string,
  branch: string,
  path: string
): Promise<GitHubFile[]> {
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}?ref=${branch}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`GitHub API error ${res.status} listing ${path}`);
  return res.json();
}

/**
 * Fetches the decoded content of a single file from GitHub.
 */
export async function fetchFileContent(
  token: string,
  repo: string,
  branch: string,
  path: string
): Promise<string> {
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}?ref=${branch}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub API error ${res.status} fetching ${path}`);
  const data = await res.json();
  // GitHub returns content as base64
  return decodeURIComponent(escape(atob(data.content.replace(/\n/g, ''))));
}
