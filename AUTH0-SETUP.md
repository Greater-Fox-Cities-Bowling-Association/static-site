# Auth0 Setup Guide

This guide will help you set up Auth0 authentication to protect your GFCBA admin dashboard.

## 🔐 Why Auth0?

Auth0 provides secure user authentication for your admin panel. This ensures only authorized users can access the CSV import and content management features.

## 📋 Prerequisites

- A free Auth0 account ([Sign up here](https://auth0.com/signup))
- Your site's URL (e.g., `https://yourdomain.com` or `http://localhost:4321` for local development)

## 🚀 Setup Steps

### 1. Create an Auth0 Application

1. **Sign in to Auth0**: Go to [manage.auth0.com](https://manage.auth0.com)

2. **Create a new application**:
   - Click "Applications" in the left sidebar
   - Click "Create Application"
   - Name: `GFCBA Admin` (or whatever you prefer)
   - Application Type: Select **Single Page Web Applications**
   - Click "Create"

3. **Configure Application Settings**:
   - Navigate to the "Settings" tab of your new application
   - Scroll down to **Application URIs**
   - Set the following:

   **For Local Development:**

   ```
   Allowed Callback URLs: http://localhost:4321/admin
   Allowed Logout URLs: http://localhost:4321
   Allowed Web Origins: http://localhost:4321
   ```

   **For Production:**

   ```
   Allowed Callback URLs: https://yourdomain.com/admin
   Allowed Logout URLs: https://yourdomain.com
   Allowed Web Origins: https://yourdomain.com
   ```

   **For Both (comma-separated):**

   ```
   Allowed Callback URLs: http://localhost:4321/admin, https://yourdomain.com/admin
   Allowed Logout URLs: http://localhost:4321, https://yourdomain.com
   Allowed Web Origins: http://localhost:4321, https://yourdomain.com
   ```

4. **Save Changes**: Scroll down and click "Save Changes"

### 2. Get Your Credentials

From the same Settings page, you'll need:

- **Domain**: Something like `your-tenant.auth0.com` or `your-tenant.us.auth0.com`
- **Client ID**: A long string like `AbCd1234EfGh5678IjKl9012`

### 3. Add to Your Environment Variables

**For Local Development:**

1. Open (or create) `.env` in your project root
2. Add the following:

```env
PUBLIC_AUTH0_DOMAIN=your-tenant.auth0.com
PUBLIC_AUTH0_CLIENT_ID=your_client_id_here
```

**For Production (Hosting Platform):**

Add these environment variables in your hosting platform's settings:

- `PUBLIC_AUTH0_DOMAIN`
- `PUBLIC_AUTH0_CLIENT_ID`

> **Note**: These are public variables (safe to expose to browsers), which is why they use the `PUBLIC_` prefix.

### 4. Test Your Setup

1. **Restart your dev server** (if running):

   ```bash
   npm run dev
   ```

2. **Navigate to the admin page**:
   - Go to `http://localhost:4321/admin`

3. **You should see**:
   - A login screen with "Sign in to Continue" button
   - Clicking it redirects to Auth0's hosted login page
   - After successful login, you're redirected back to `/admin`

## 👥 Managing Users

### Adding Users

**Option 1: Self-Signup (Easiest for Testing)**

- Users can sign up directly through the login screen
- By default, Auth0 allows email/password signups

**Option 2: Invite Users (Recommended for Production)**

1. Go to Auth0 Dashboard → User Management → Users
2. Click "Create User"
3. Enter email and temporary password
4. Check "Require password change on first login"
5. Click "Create"

### Restricting Access

To prevent unauthorized signups in production:

1. Go to your Auth0 application → Settings → Advanced Settings
2. Find **Authentication** section
3. Disable "Username-Password-Authentication" if you want invite-only access

**Or** enable more granular controls:

1. Go to Authentication → Database → Username-Password-Authentication
2. Click on "Settings" tab
3. Toggle off "Disable Sign Ups" to prevent public registration
4. Save changes

## 🔒 Security Best Practices

### 1. Enable Multi-Factor Authentication (MFA)

1. Go to Security → Multi-factor Auth
2. Enable at least one MFA factor (e.g., SMS, Authenticator App)
3. Configure the policy (required or optional)

### 2. Add User Roles (Optional but Recommended)

For more granular access control:

1. Go to User Management → Roles
2. Create a role like "Admin" or "Editor"
3. Assign users to roles
4. Use roles in your application logic if needed

### 3. Set Token Expiration

1. Go to Applications → Your App → Settings → Advanced Settings
2. Navigate to "OAuth" tab
3. Set appropriate token lifetimes:
   - **ID Token Expiration**: 36000 seconds (10 hours)
   - **Refresh Token Expiration**: 2592000 seconds (30 days)

## 🌍 Social Logins (Optional)

Want users to log in with Google, GitHub, Microsoft, etc.?

1. Go to Authentication → Social
2. Click on the provider you want (e.g., Google)
3. Follow the provider-specific setup instructions
4. Enable the connection for your application

## 🐛 Troubleshooting

### "Auth0 Not Configured" Error

- **Problem**: Missing environment variables
- **Solution**: Verify `PUBLIC_AUTH0_DOMAIN` and `PUBLIC_AUTH0_CLIENT_ID` are set in `.env`
- **Note**: Restart your dev server after adding variables

### "Callback URL Mismatch" Error

- **Problem**: The redirect URL doesn't match Auth0 settings
- **Solution**: Add your full callback URL to "Allowed Callback URLs" in Auth0:
  - Format: `http://localhost:4321/admin` or `https://yourdomain.com/admin`
  - Make sure there are no trailing slashes

### Stuck on Loading Screen

- **Problem**: Auth0 isn't completing the authentication flow
- **Solution**:
  - Check browser console for errors
  - Verify "Allowed Web Origins" is set correctly
  - Clear browser cache and try again

### Login Works but Returns to Empty Page

- **Problem**: Application can't find the Auth0Provider
- **Solution**: Ensure the admin page is wrapped with Auth0Provider in Astro component

## 📚 Additional Resources

- [Auth0 Documentation](https://auth0.com/docs)
- [Auth0 React SDK Docs](https://auth0.com/docs/libraries/auth0-react)
- [Auth0 Dashboard](https://manage.auth0.com)

## 🔄 Two-Layer Authentication

This app uses a two-layer authentication approach:

1. **Auth0** - Controls who can access the admin panel
   - Verifies user identity
   - Prevents unauthorized access to the dashboard

2. **GitHub OAuth** - Authorizes what the user can do
   - After Auth0 login, users authenticate with GitHub
   - This provides their personal GitHub token for making commits
   - Ensures proper audit trail (commits show real user names)
   - Users must have write access to your repository

This separation ensures:

- ✅ Secure access control (Auth0)
- ✅ Proper attribution of changes (GitHub)
- ✅ Fine-grained repository permissions (GitHub organization settings)

## ✅ Next Steps

After setting up Auth0:

1. Set up GitHub OAuth for repository access (see [GITHUB-OAUTH-SETUP.md](./GITHUB-OAUTH-SETUP.md))
2. Configure your repository settings (`GITHUB_OWNER` and `GITHUB_REPO`)
3. Test the full authentication flow
4. Add authorized users to your Auth0 tenant
