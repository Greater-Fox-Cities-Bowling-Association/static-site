# Auth0 + GitHub PAT Setup (Simple Approach)

This guide shows how to configure Auth0 to automatically provide the GitHub Personal Access Token to authenticated users.

## How It Works

1. User logs in with Auth0
2. Auth0 Action injects GitHub PAT into the user's ID token
3. Client receives the token automatically
4. All authenticated users share the same service account PAT

## Setup Steps

### Step 1: Store PAT in Auth0 Secrets

1. Go to **Auth0 Dashboard**: https://manage.auth0.com/
2. Navigate to **Actions → Library**
3. Click **"Build Custom"**
4. **Name**: `Add GitHub Token`
5. **Trigger**: `Login / Post Login`
6. **Runtime**: `Node 18` (recommended)
7. Click **"Create"**

### Step 2: Add the Secret

1. In the Action editor, click the **Secrets icon (🔑)** on the left sidebar
2. Click **"Add Secret"**
3. Configure:
   - **Key**: `GITHUB_PAT`
   - **Value**: `ghp_Uf0jYyETH6xdLldS9ujXupgP6b7ig90UZMls` (your actual PAT)
4. Click **"Create"**

### Step 3: Add Action Code

Paste this code into the Action editor:

```javascript
/**
 * Handler that will be called during the execution of a PostLogin flow.
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  // Get the GitHub PAT from secrets
  const githubToken = event.secrets.GITHUB_PAT;

  if (githubToken) {
    // Add it as a custom claim to the ID token
    api.idToken.setCustomClaim("https://gfcba.com/github_token", githubToken);
    console.log(`GitHub token added for user: ${event.user.email}`);
  } else {
    console.warn("GITHUB_PAT secret not configured");
  }
};
```

Click **"Deploy"** (top right).

### Step 4: Add Action to Login Flow

1. Navigate to **Actions → Flows → Login**
2. You'll see a flow diagram with "Start" → "Complete"
3. On the right sidebar, find **"Add GitHub Token"** under "Custom"
4. **Drag and drop** it between "Start" and "Complete"
5. Click **"Apply"** (top right)

### Step 5: Test It

1. Make sure your dev server is running: `npm run dev`
2. Go to `/admin` in your browser
3. Log in with Auth0
4. Check the browser console for:
   - `"Auth0 State:"`
   - `"GitHub token received from Auth0"`

If you see those messages, it's working! ✅

### Step 6: Disable Sign Ups (Security)

To ensure only invited users can access the admin:

1. Go to **Authentication → Database → Username-Password-Authentication**
2. Click the **"Settings"** tab
3. Scroll to **"Disable Sign Ups"**
4. Toggle it **ON**
5. Click **"Save"**

Now you can manually add authorized users via **User Management → Users → + Create User**.

## How to Add New Users

1. Go to **User Management → Users**
2. Click **"+ Create User"**
3. Enter:
   - **Email**: user's email address
   - **Password**: temporary password (or send verification email)
4. Click **"Create"**
5. The user will automatically get the GitHub token when they log in

## Troubleshooting

**"No GitHub token found in Auth0 claims"** in browser console:

- Check that the Action is deployed
- Verify the Action is in the Login flow
- Make sure `GITHUB_PAT` secret is set correctly

**Action not running:**

- Go to **Monitoring → Logs** in Auth0
- Look for errors related to your Action
- Check that the Action is enabled in the flow

**GitHub commits not working:**

- Verify the PAT hasn't expired
- Check PAT has `repo` scope in GitHub
- Test the PAT manually: `curl -H "Authorization: token ghp_xxx..." https://api.github.com/user`

## Security Notes

✅ **PAT stored securely** in Auth0 server-side secrets (never in your code)
✅ **Only authenticated users** receive the token
✅ **Auth0 sign-ups disabled** so only invited users can access
✅ **Token in localStorage** after login (standard practice for SPAs)

The PAT is for the service account `fox-cities-bowling-association@gmail.com`, so all commits will appear to come from that account.

## Custom Claim Namespace

The namespace `https://gfcba.com/github_token` is used to avoid conflicts with reserved Auth0 claims. Auth0 requires custom claims to use a namespaced format (URL-like string).

If you need to change it, update both:

1. The Action code: `api.idToken.setCustomClaim('https://your-domain.com/github_token', ...)`
2. ImportAdmin.tsx: `const token = (user as any)['https://your-domain.com/github_token'];`
