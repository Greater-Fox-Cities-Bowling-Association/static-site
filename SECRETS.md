# Secrets & Environment Variables Setup

This document outlines all secrets and environment variables required for the GFCBA project.

## 🔐 Required Secrets

### 1. GitHub Personal Access Token

**Purpose**: Enables Decap CMS to commit content changes to your repository.

**How to Obtain**:
1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "GFCBA Decap CMS")
4. Set expiration (recommend 90 days for security)
5. Select scopes:
   - ✅ `repo` (Full control of private repositories)
6. Click "Generate token"
7. **IMPORTANT**: Copy the token immediately (you won't see it again)

**Where to Set**:
- **Local Development**: Add to `.env` file as `GITHUB_TOKEN=your_token_here`
- **Decap CMS**: Configure in `public/admin/config.yml` (uses OAuth flow in production)
- **CI/CD**: Not directly needed (GitHub Actions uses built-in `GITHUB_TOKEN`)

---

### 2. Static.app API Key

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
   GITHUB_TOKEN=ghp_your_actual_token_here
   GITHUB_OWNER=yourusername
   GITHUB_REPO=gfcba
   STATIC_APP_API_KEY=sa_your_actual_key_here
   ```

3. **Add `.env` to `.gitignore`** (should already be there):
   ```
   .env
   .env.local
   ```

---

## 🚀 GitHub Actions Secrets

Navigate to your repository: **Settings → Secrets and variables → Actions**

Add the following repository secrets:

| Secret Name | Description |
|-------------|-------------|
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

### Decap CMS login issues
- Verify `GITHUB_TOKEN` has `repo` scope
- Check token hasn't expired
- Ensure `GITHUB_OWNER` and `GITHUB_REPO` match your repository

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
- **GitHub tokens**: [GitHub Docs - Personal Access Tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- **Static.app**: [Static.app Documentation](https://static.app/docs)
- **Decap CMS**: [Decap CMS Docs](https://decapcms.org/docs/)
