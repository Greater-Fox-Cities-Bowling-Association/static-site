# Secrets & Environment Variables Setup

This document outlines all secrets and environment variables required for the GFCBA project.

## 🔐 Required Secrets

### 1. Auth0 Credentials (Admin Authentication)

**Purpose**: Protects the admin dashboard with secure user authentication.

**How to Obtain**:
See detailed setup instructions in [AUTH0-SETUP.md](./AUTH0-SETUP.md)

**Quick Setup**:

1. Create a free Auth0 account at [auth0.com](https://auth0.com/signup)
2. Create a Single Page Application
3. Configure callback URLs: `http://localhost:4321/admin` (dev) and `https://yourdomain.com/admin` (production)
4. Copy Domain and Client ID

**Where to Set**:

- **Local Development**: Add to `.env` file
  ```env
  PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
  PUBLIC_AUTH0_CLIENT_ID=your_client_id_here
  ```
- **Production**: Set as environment variables in your hosting platform

---

### 2. GitHub OAuth App (For Repository Access)

**Purpose**: Allows authenticated users to commit changes to the repository using their own GitHub account.

**How to Obtain**:
See detailed setup instructions in [GITHUB-OAUTH-SETUP.md](./GITHUB-OAUTH-SETUP.md)

**Quick Setup**:

1. Create a GitHub OAuth App at [github.com/settings/developers](https://github.com/settings/developers)
2. Set Authorization callback URL: `http://localhost:4321/admin` (dev) and `https://yourdomain.com/admin` (production)
3. Enable Device Flow (for PKCE support)
4. Copy Client ID

**Where to Set**:

- **Local Development**: Add to `.env` file
  ```env
  PUBLIC_GITHUB_CLIENT_ID=your_github_oauth_client_id
  PUBLIC_GITHUB_OWNER=your_github_username
  PUBLIC_GITHUB_REPO=gfcba
  ```
- **Production**: Set as environment variables in your hosting platform

**Note**: Users will authenticate with their personal GitHub accounts. They must have write access to your repository.

---

### 3. GitHub Personal Access Token (Deprecated - Optional Fallback)

**Purpose**: Fallback option if GitHub OAuth is not configured.

**How to Obtain**:

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "GFCBA Admin")
4. Set expiration (recommend 90 days for security)
5. Select scopes:
   - ✅ `repo` (Full control of private repositories)
6. Click "Generate token"
7. **IMPORTANT**: Copy the token immediately (you won't see it again)

**Where to Set**:

- Users can manually enter this token in the admin panel if GitHub OAuth is not configured
- This is **not recommended** for production use - prefer GitHub OAuth

---

### 4. Static.app API Key

**Purpose**: Deploys your built site to Static.app hosting.

**How to Obtain**:

1. Sign up at [static.app](https://static.app)
2. Create a new project or use an existing one
3. Navigate to Project Settings → API Keys
4. Click "Create API Key"
5. Give it a name (e.g., "GitHub Actions Deploy")
6. Copy the generated API key

**Where to Set**:

- **GitHub Secrets**: Go to your repo → Settings → Secrets and variables → Actions
- Click "New repository secret"
- Name: `STATIC_APP_API_KEY`
- Value: Paste your API key
- This is used by `.github/workflows/deploy.yml`

---

## 🔧 Local Development Setup

1. **Copy the example environment file**:

   ```bash
   cp .env.example .env
   ```

2. **Fill in your secrets**:

   ```env
   # Auth0 (Required for admin access)
   PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
   PUBLIC_AUTH0_CLIENT_ID=your_auth0_client_id

   # GitHub OAuth (Required for committing changes)
   PUBLIC_GITHUB_CLIENT_ID=your_github_oauth_client_id
   PUBLIC_GITHUB_OWNER=yourusername
   PUBLIC_GITHUB_REPO=gfcba

   # Static.app (Required for deployment)
   STATIC_APP_API_KEY=sa_your_actual_key_here
   ```

3. **Add `.env` to `.gitignore`** (should already be there):
   ```
   .env
   .env.local
   ```

---

## 🔄 Two-Layer Authentication

The admin panel uses a secure two-layer authentication approach:

1. **Auth0 Login** (Layer 1)
   - Controls who can access the admin dashboard
   - Verifies user identity
   - Single sign-on capability

2. **GitHub OAuth** (Layer 2)
   - After Auth0 login, users connect their GitHub account
   - Provides personal GitHub token for making commits
   - Ensures proper audit trail (commits show real GitHub usernames)
   - Users must have write access to your repository

**Benefits**:

- ✅ Secure access control
- ✅ Proper change attribution
- ✅ No shared tokens or passwords
- ✅ Fine-grained repository permissions

---

## 🚀 GitHub Actions Secrets

Navigate to your repository: **Settings → Secrets and variables → Actions**

Add the following repository secrets:

| Secret Name          | Description                            |
| -------------------- | -------------------------------------- |
| `STATIC_APP_API_KEY` | API key from Static.app for deployment |

**Note**: `GITHUB_TOKEN` is automatically provided by GitHub Actions - you don't need to add it manually.

---

## 📝 Optional Secrets

### Analytics (Future Enhancement)

If you plan to add analytics later:

- **Google Analytics**: `GOOGLE_ANALYTICS_ID` (format: `G-XXXXXXXXXX`)
- **Plausible Analytics**: `PLAUSIBLE_DOMAIN` (your domain name)

---

## ⚠️ Security Best Practices

1. **Never commit `.env` files** to Git
2. **Rotate tokens every 90 days** (set expiration reminders)
3. **Use minimal scopes** - only grant necessary permissions
4. **Different tokens for different environments** (dev vs production)
5. **Revoke tokens immediately** if compromised
6. **Team members should use their own tokens** - never share personal access tokens

---

## 🔍 Troubleshooting

### Auth0 login issues

- Verify `PUBLIC_AUTH0_DOMAIN` and `PUBLIC_AUTH0_CLIENT_ID` are set
- Check callback URLs match in Auth0 settings
- See [AUTH0-SETUP.md](./AUTH0-SETUP.md) for detailed troubleshooting

### GitHub OAuth issues

- Verify `PUBLIC_GITHUB_CLIENT_ID` is set
- Check callback URL matches in GitHub OAuth App settings
- Ensure users have write access to the repository
- See [GITHUB-OAUTH-SETUP.md](./GITHUB-OAUTH-SETUP.md) for detailed troubleshooting

### Decap CMS login issues (Deprecated)

- The old Decap CMS is no longer used
- Use the new admin panel at `/admin` instead

### Deployment failures

- Verify `STATIC_APP_API_KEY` is set in GitHub Secrets
- Check Static.app project exists and is active
- Review GitHub Actions logs for specific error messages

### Local development issues

- Ensure `.env` file exists in project root
- Verify no extra spaces in `.env` file entries
- Restart dev server after modifying `.env`

---

## 📞 Support

For issues with:

- **Auth0**: [AUTH0-SETUP.md](./AUTH0-SETUP.md) or [Auth0 Documentation](https://auth0.com/docs)
- **GitHub OAuth**: [GITHUB-OAUTH-SETUP.md](./GITHUB-OAUTH-SETUP.md) or [GitHub OAuth Docs](https://docs.github.com/en/developers/apps/building-oauth-apps)
- **GitHub tokens**: [GitHub Docs - Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- **Static.app**: [Static.app Documentation](https://static.app/docs)
