# Admin Panel Setup Checklist

Use this checklist to set up the admin panel authentication for your GFCBA website.

## ✅ Setup Checklist

### 1. Auth0 Configuration

- [ ] Create Auth0 account at [auth0.com/signup](https://auth0.com/signup)
- [ ] Create a new Single Page Application
- [ ] Configure Allowed Callback URLs:
  - Development: `http://localhost:4321/admin`
  - Production: `https://yourdomain.com/admin`
- [ ] Configure Allowed Logout URLs:
  - Development: `http://localhost:4321`
  - Production: `https://yourdomain.com`
- [ ] Configure Allowed Web Origins:
  - Development: `http://localhost:4321`
  - Production: `https://yourdomain.com`
- [ ] Copy Auth0 Domain (e.g., `your-tenant.auth0.com`)
- [ ] Copy Client ID

**See [AUTH0-SETUP.md](./AUTH0-SETUP.md) for detailed instructions**

### 2. GitHub OAuth App Configuration

- [ ] Create GitHub OAuth App at [github.com/settings/developers](https://github.com/settings/developers)
- [ ] Set Application Name (e.g., "GFCBA Admin")
- [ ] Set Homepage URL:
  - Development: `http://localhost:4321`
  - Production: `https://yourdomain.com`
- [ ] Set Authorization callback URL:
  - Development: `http://localhost:4321/admin`
  - Production: `https://yourdomain.com/admin`
- [ ] Enable Device Flow (for PKCE support)
- [ ] Copy Client ID

**See [GITHUB-OAUTH-SETUP.md](./GITHUB-OAUTH-SETUP.md) for detailed instructions**

### 3. Environment Variables

- [ ] Create `.env` file in project root (copy from `.env.example`)
- [ ] Add Auth0 credentials:
  ```env
  PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
  PUBLIC_AUTH0_CLIENT_ID=your_auth0_client_id
  ```
- [ ] Add GitHub OAuth credentials:
  ```env
  PUBLIC_GITHUB_CLIENT_ID=your_github_oauth_client_id
  PUBLIC_GITHUB_OWNER=your_github_username
  PUBLIC_GITHUB_REPO=gfcba
  ```
- [ ] Verify `.env` is in `.gitignore` (should already be there)

### 4. Production Deployment

- [ ] Add environment variables to your hosting platform:
  - `PUBLIC_AUTH0_DOMAIN`
  - `PUBLIC_AUTH0_CLIENT_ID`
  - `PUBLIC_GITHUB_CLIENT_ID`
  - `PUBLIC_GITHUB_OWNER`
  - `PUBLIC_GITHUB_REPO`
- [ ] Update Auth0 Allowed URLs to include production domain
- [ ] Update GitHub OAuth callback URL to include production domain

### 5. User Access

- [ ] Add authorized users to Auth0:
  - Option A: Allow self-signup (for testing)
  - Option B: Manually invite users (recommended for production)
- [ ] Ensure users have write access to GitHub repository:
  - Go to repository Settings → Collaborators
  - Add users with write or admin access

### 6. Testing

- [ ] Start development server: `npm run dev`
- [ ] Navigate to `http://localhost:4321/admin`
- [ ] Test Auth0 login flow
- [ ] Test GitHub OAuth connection
- [ ] Try uploading a CSV file
- [ ] Verify commit appears in GitHub with correct username

## 🔒 Security Best Practices

After setup is complete:

- [ ] Enable Auth0 Multi-Factor Authentication
- [ ] Review Auth0 user list and remove test accounts
- [ ] Disable self-signup in Auth0 (for production)
- [ ] Set up Auth0 user roles (optional but recommended)
- [ ] Review GitHub repository collaborators
- [ ] Set token expiration times in Auth0
- [ ] Set up monitoring/alerts for failed login attempts

## 🆘 Troubleshooting

If you encounter issues:

1. **"Auth0 Not Configured" error**
   - Check that `PUBLIC_AUTH0_DOMAIN` and `PUBLIC_AUTH0_CLIENT_ID` are set
   - Restart dev server after adding environment variables

2. **"Callback URL Mismatch" error**
   - Verify callback URLs in Auth0 match exactly (including `/admin` path)
   - Check for trailing slashes

3. **GitHub OAuth fails**
   - Verify `PUBLIC_GITHUB_CLIENT_ID` is set
   - Check callback URL in GitHub OAuth App settings
   - Enable Device Flow in GitHub OAuth App

4. **"Access denied" when trying to commit**
   - User must be added as collaborator to GitHub repository
   - User needs "write" or "admin" access level

For detailed troubleshooting, see:

- [AUTH0-SETUP.md](./AUTH0-SETUP.md)
- [GITHUB-OAUTH-SETUP.md](./GITHUB-OAUTH-SETUP.md)
- [SECRETS.md](./SECRETS.md)

## 📚 Documentation

- [README.md](./README.md) - Project overview
- [AUTH0-SETUP.md](./AUTH0-SETUP.md) - Detailed Auth0 setup guide
- [GITHUB-OAUTH-SETUP.md](./GITHUB-OAUTH-SETUP.md) - Detailed GitHub OAuth setup guide
- [SECRETS.md](./SECRETS.md) - All environment variables and secrets
- [CSV-IMPORT-GUIDE.md](./CSV-IMPORT-GUIDE.md) - CSV format specifications

## ✨ You're All Set!

Once all checkboxes are completed, your admin panel is ready to use!

Access it at: `https://yourdomain.com/admin`
