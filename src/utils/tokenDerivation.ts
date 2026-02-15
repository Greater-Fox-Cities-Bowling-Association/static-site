/**
 * Derives the GitHub Personal Access Token from Auth0 claims and client secret
 * This uses XOR encryption for simplicity - the token is stored encrypted in Auth0
 * and can only be decrypted with the client-side key
 */

// Simple XOR encryption/decryption
function xorEncryptDecrypt(input: string, key: string): string {
  let result = '';
  for (let i = 0; i < input.length; i++) {
    result += String.fromCharCode(input.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

// Convert string to base64
function toBase64(str: string): string {
  return btoa(str);
}

// Convert base64 to string
function fromBase64(b64: string): string {
  return atob(b64);
}

/**
 * Encrypts a GitHub PAT (for storing in Auth0 user metadata)
 * Use this function once to prepare the encrypted token for Auth0
 */
export function encryptGitHubToken(pat: string, secret: string): string {
  const encrypted = xorEncryptDecrypt(pat, secret);
  return toBase64(encrypted);
}

/**
 * Decrypts the GitHub PAT using the Auth0 custom claim and client secret
 * This is called on the client after Auth0 authentication
 */
export function deriveGitHubToken(encryptedToken: string, clientSecret: string): string {
  try {
    const decoded = fromBase64(encryptedToken);
    return xorEncryptDecrypt(decoded, clientSecret);
  } catch (error) {
    console.error('Failed to derive GitHub token:', error);
    throw new Error('Invalid token encryption');
  }
}

/**
 * Alternative: Split token approach (simpler but less secure)
 * The GitHub PAT is split into two parts stored separately
 */
export function splitToken(pat: string): { part1: string; part2: string } {
  const mid = Math.floor(pat.length / 2);
  return {
    part1: toBase64(pat.substring(0, mid)),
    part2: toBase64(pat.substring(mid))
  };
}

export function combineToken(part1: string, part2: string): string {
  return fromBase64(part1) + fromBase64(part2);
}
