# GitHub OAuth with PKCE Setup Guide

This guide will help you enable **Sign in with GitHub** for your admin panel using OAuth 2.0 with PKCE (no backend required!).

## 🎯 What You Get

- ✅ **No manual tokens**: Users click "Sign in with GitHub" and they're done
- ✅ **Fully static**: No serverless functions or backend needed
- ✅ **Secure**: PKCE flow prevents token theft
- ✅ **Standard OAuth**: Same method used by React, Vue, Angular apps

## 📋 Setup Steps

### 1. Create a GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"New OAuth App"**
3. Fill in the details:
   - **Application name**: `GFCBA Admin` (or your site name)
   - **Homepage URL**: `https://yourdomain.com` (or `http://localhost:4321` for local dev)
   - **Authorization callback URL**: `https://yourdomain.com/admin` (or `http://localhost:4321/admin`)
   - **Enable Device Flow**: Leave unchecked
4. Click **"Register application"**
5. You'll see your **Client ID** - copy this!

### 2. Configure Environment Variables

Create or update your `.env` file in the project root:

```env
# GitHub OAuth Client ID
PUBLIC_GITHUB_CLIENT_ID=Ov23li... # Your Client ID from step 1

# Repository for Access Control (required!)
PUBLIC_GITHUB_OWNER=your-github-username
PUBLIC_GITHUB_REPO=static-site
```

**Important Notes:**

- Variables MUST start with `PUBLIC_` for Astro to expose them to the client
- You do NOT need a Client Secret (that's the magic of PKCE!)
- `PUBLIC_GITHUB_OWNER` and `PUBLIC_GITHUB_REPO` enable automatic access verification
- Never commit `.env` to git - it's already in `.gitignore`

### 3. Build and Deploy

```bash
npm run build
```

Deploy the `dist/` folder to your static host (Static.app, Netlify, Vercel, etc.)

### 4. Test It!

1. Visit `https://yourdomain.com/admin`
2. Click **"Sign in with GitHub"**
3. Authorize the app
4. You're automatically logged in! 🎉

## 🔄 How It Works

### Traditional OAuth (needs backend):

```
User → GitHub → Backend exchanges code+secret → Token → Frontend
                  ❌ Requires server & client_secret
```

### OAuth with PKCE (pure client-side):

```
User → GitHub → Frontend exchanges code+verifier → Token
                  ✅ No server needed!
```

### The PKCE Flow:

1. **User clicks "Sign in"**
   - App generates random `code_verifier`
   - Creates `code_challenge` = SHA-256(verifier)
   - Redirects to GitHub with `code_challenge`

2. **GitHub authenticates user**
   - User approves permissions
   - GitHub redirects back with `code`

3. **App exchanges code for token**
   - Sends `code` + original `code_verifier` to GitHub
   - GitHub verifies: SHA-256(verifier) === stored challenge
   - Returns access token ✅

**Why it's secure:** Only the original browser has the `code_verifier`, so intercepting the `code` is useless.

## 🛠 Local Development

For local testing, create `.env` with localhost redirect:

```env
PUBLIC_GITHUB_CLIENT_ID=Ov23li...
```

And set the OAuth app callback URL to:

```
http://localhost:4321/admin
```

Run the dev server:

```bash
npm run dev
```

Visit http://localhost:4321/admin and test!

## 🔒 Security Notes

- ✅ No Client Secret needed (PKCE flow)
- ✅ Token stored in localStorage (same as manual token)
- ✅ Code verifier stored in sessionStorage (cleared after use)
- ✅ Standard OAuth 2.0 PKCE flow (RFC 7636)
- ✅ **Automatic repository access verification**
- ⚠️ Users need `repo` scope to commit changes

### 🛡️ Repository Access Control

After successful authentication, the app **automatically verifies** that the user has write access to your repository:

**How it works:**

1. User signs in with GitHub OAuth
2. App calls GitHub API: `/repos/{owner}/{repo}/collaborators/{username}/permission`
3. Checks permission level (`admin`, `write`, `read`, or `none`)
4. **Only allows `admin` or `write`** - read-only users are denied

**Error messages:**

- `"Access denied. You need write access to owner/repo"` - User has no access or read-only
- `"Insufficient permissions. You have 'read' access but need 'write' or 'admin' access"` - Explicit permission mismatch

**Configuration:**

Set these in `.env`:

```env
PUBLIC_GITHUB_OWNER=your-github-username
PUBLIC_GITHUB_REPO=your-repo-name
```

If not configured, the access check is skipped (dev mode fallback).

**Why this matters:**

- ✅ No unauthorized users can access the admin panel
- ✅ Works 100% client-side (no backend needed)
- ✅ Leverages GitHub's built-in permission system
- ✅ One API call after authentication = negligible performance impact

## 🎨 Fallback: Manual Token Entry

If OAuth isn't configured or users prefer PATs, they can click:
**"Use personal access token instead"**

This shows the original token input for users who want manual control.

## 📚 Resources

- [RFC 7636 - PKCE](https://datatracker.ietf.org/doc/html/rfc7636)
- [GitHub OAuth Documentation](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps)
- [OAuth 2.0 for Browser-Based Apps](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-browser-based-apps)

## ❓ Troubleshooting

### "Access denied" after successful OAuth

**Cause:** User doesn't have write access to the repository.

**Solutions:**

1. **Add user as collaborator:**
   - Go to your repo → Settings → Collaborators
   - Click "Add people"
   - Give them **Write** or **Admin** role (not Read)

2. **Verify environment variables:**

   ```bash
   # Check .env file
   PUBLIC_GITHUB_OWNER=your-github-username  # Must match your repo
   PUBLIC_GITHUB_REPO=your-repo-name          # Must match your repo
   ```

3. **For organization repos:**
   - User must be a member of the organization
   - Or added as an outside collaborator with write access

### "Unable to verify repository access"

- Check internet connection
- Verify GitHub API is accessible
- Token might be rate-limited (wait a few minutes)

### "GitHub OAuth not configured" error

- Make sure `PUBLIC_GITHUB_CLIENT_ID` is set in `.env`
- Rebuild the project (`npm run build`)
- Check that the variable starts with `PUBLIC_`

### OAuth redirect fails

- Verify the callback URL in your GitHub OAuth app matches exactly
- For localhost: `http://localhost:4321/admin`
- For production: `https://yourdomain.com/admin`

### "Invalid code" error

- The authorization code might have expired (10 min timeout)
- Try signing in again
- Clear sessionStorage and retry

### Multiple OAuth apps for different environments

**Development:**

```
Homepage URL: http://localhost:4321
Callback URL: http://localhost:4321/admin
```

**Production:**

```
Homepage URL: https://yourdomain.com
Callback URL: https://yourdomain.com/admin
```

Use different Client IDs in `.env` vs production environment variables.

---

**That's it!** Your static site now has production-ready GitHub authentication. 🚀
