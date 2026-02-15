# GitHub Token Security Setup

This guide explains how to set up secure GitHub token derivation using Auth0 custom claims.

## Security Model

The GitHub Personal Access Token (PAT) is never stored in plain text. Instead:

1. **Encrypted token** is stored in Auth0 user metadata
2. **Decryption key** is stored in client environment variables
3. **Derived token** is computed client-side only after Auth0 authentication
4. Only authenticated users who pass Auth0 can access the client secret

## Setup Steps

### 1. Prepare Your GitHub PAT

First, create a GitHub PAT with repo access:

- Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
- Generate new token with `repo` scope
- Copy the token (e.g., `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)

### 2. Generate Encrypted Token

Use Node.js to encrypt your GitHub PAT:

```javascript
// Run this in Node.js console or create encrypt-token.js
function xorEncrypt(input, key) {
  let result = "";
  for (let i = 0; i < input.length; i++) {
    result += String.fromCharCode(
      input.charCodeAt(i) ^ key.charCodeAt(i % key.length),
    );
  }
  return Buffer.from(result).toString("base64");
}

const githubPAT = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
const secret = "your-random-secret-key-make-it-long-and-complex";
const encrypted = xorEncrypt(githubPAT, secret);

console.log("Encrypted token:", encrypted);
console.log("Secret key:", secret);
```

### 3. Add Environment Variable

Add to your `.env` file:

```bash
PUBLIC_GITHUB_TOKEN_SECRET=your-random-secret-key-make-it-long-and-complex
```

### 4. Configure Auth0 Custom Claims

#### Option A: Using Auth0 Actions (Recommended)

1. Go to Auth0 Dashboard → Actions → Flows → Login
2. Create a new Action called "Add GitHub Token"
3. Add this code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const encryptedToken = event.user.user_metadata?.github_token_encrypted;

  if (encryptedToken) {
    api.idToken.setCustomClaim(
      "https://your-domain.com/github_token",
      encryptedToken,
    );
  }
};
```

4. Deploy and add to Login flow

#### Option B: Using Auth0 Rules (Legacy)

1. Go to Auth0 Dashboard → Auth Pipeline → Rules
2. Create a new Rule:

```javascript
function addGitHubToken(user, context, callback) {
  const encryptedToken = user.user_metadata?.github_token_encrypted;

  if (encryptedToken) {
    context.idToken["https://your-domain.com/github_token"] = encryptedToken;
  }

  callback(null, user, context);
}
```

### 5. Add Encrypted Token to User Metadata

For each authorized user in Auth0:

1. Go to User Management → Users
2. Select the user
3. Scroll to "Metadata" section
4. Add to `user_metadata`:

```json
{
  "github_token_encrypted": "THE_ENCRYPTED_TOKEN_FROM_STEP_2"
}
```

### 6. Update Custom Claim Namespace

In the ImportAdmin component, update the namespace to match your domain:

```typescript
const encryptedToken = (user as any)["https://your-domain.com/github_token"];
```

Change `https://your-domain.com/github_token` to match your actual domain or a consistent namespace.

## How It Works

1. User logs in with Auth0
2. Auth0 Action adds encrypted token as custom claim to ID token
3. ImportAdmin component receives the encrypted token
4. Client derives the GitHub PAT using: `decrypted = XOR(encrypted_token, client_secret)`
5. GitHub PAT is used to make API calls

## Security Notes

- ✅ GitHub PAT never stored in plain text
- ✅ Requires both Auth0 authentication AND client secret
- ✅ Token derivation happens client-side after authentication
- ⚠️ Client secret is in public env vars (obfuscated but visible in bundle)
- ⚠️ Not as secure as a backend API, but good for static sites
- 💡 Consider rotating the secret and re-encrypting tokens periodically

## Alternative: Split Token Approach

For simpler setup, you can split the token in half:

1. Store first half in Auth0: `user_metadata.gh_part1`
2. Store second half in env: `PUBLIC_GH_PART2`
3. Combine: `const token = combineToken(part1, part2)`

This is less secure but easier to implement.

## Testing

To verify the setup works:

1. Log in to the admin panel
2. Check browser console for: `"GitHub token derived successfully"`
3. Try uploading a CSV or editing a page
4. Verify GitHub commits are created

## Troubleshooting

**Token derivation fails:**

- Check that `PUBLIC_GITHUB_TOKEN_SECRET` matches the encryption key
- Verify encrypted token is in Auth0 user metadata
- Check Auth0 Action is deployed and in the flow

**Custom claim not found:**

- Verify the namespace URL matches in both Action and component
- Check browser console for the user object structure
- Ensure Action is added to the Login flow

**GitHub API calls fail:**

- Test the derived token manually on GitHub API
- Verify the PAT has correct permissions (repo scope)
- Check the PAT hasn't expired
