# WiraDev: Production Vercel Deployment & OAuth Configuration Guide

This guide provides end-to-end instructions for deploying the **WiraDev** frontend application to Vercel, integrating with the upstream backend (`https://wirakarsa.infinitelearningstudent.id/`), and configuring Google and GitHub OAuth providers.

---

## 1. Architecture & Cross-Domain Session Model

WiraDev uses a decoupled architecture:
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4 hosted on **Vercel** (`https://<project-name>.vercel.app`).
- **Backend**: Express 5, TypeScript, MySQL hosted at `https://wirakarsa.infinitelearningstudent.id/`.

### Eliminating Third-Party Cookie Blocking
Modern browsers block third-party `SameSite=Lax` cookies during cross-site `fetch` calls. To prevent authentication failure when the Vercel frontend communicates with the backend, `wiradev-fe/next.config.ts` configures server-side reverse proxy rewrites:
```ts
async rewrites() {
  return [
    {
      source: "/api/:path*",
      destination: `${BACKEND_URL}/api/:path*`,
    },
    {
      source: "/uploads/:path*",
      destination: `${BACKEND_URL}/uploads/:path*`,
    },
  ];
}
```
All frontend network requests target same-origin `/api/...`, which Vercel proxies directly to the backend. This enables HTTP-only cookies (`access_token`, `refresh_token`) to function transparently without cross-site cookie restrictions.

Additionally, `lib/api-client.ts` implements **dual-mode token transmission**:
1. Standard HTTP-only session cookies (`credentials: "include"`).
2. `Authorization: Bearer <accessToken>` header retrieved from SSR-safe `localStorage`, enabling API interoperability and fallback authentication.

---

## 2. Google Cloud Console Configuration (Google Sign-In)

Google Sign-In uses Google Identity Services with a popup modal on `/google-login`.

### Step 1: Open Google Cloud Console
1. Navigate to [Google Cloud Console Credentials](https://console.cloud.google.com/apis/credentials).
2. Select or create your project (e.g. `WiraDev-Competition` or `Wirapath`).
3. If not already configured, set up the **OAuth Consent Screen** (User type: *External*, add scopes: `userinfo.email`, `userinfo.profile`, `openid`).

### Step 2: Create OAuth 2.0 Web Client ID
1. Click **Create Credentials** > **OAuth client ID**.
2. Application type: Select **Web application**.
3. Name: `WiraDev Web Client`.

### Step 3: Configure Authorized JavaScript Origins
Add the following origins (HTTP and HTTPS origins where the Google button will be rendered):
- **Local Development**:
  - `http://localhost:3000`
  - `http://localhost:5000`
- **Production Vercel**:
  - `https://<your-project>.vercel.app` (e.g. `https://wiradev.vercel.app`)
  - Any custom domain (e.g. `https://wiradev.id`)
- **Vercel Preview Deployments**:
  - Add specific preview domains if testing on preview branches (e.g. `https://wiradev-git-main-<team>.vercel.app`).

### Step 4: Configure Authorized Redirect URIs
Add the following redirect URIs:
- `http://localhost:3000/oauth-callback`
- `http://localhost:3000/google-login`
- `https://<your-project>.vercel.app/oauth-callback`
- `https://<your-project>.vercel.app/google-login`

### Step 5: Save Credentials
1. Copy the generated **Client ID** (e.g. `159334240812-3k5m6m19u2h5uljs0t5rckauajkovgel.apps.googleusercontent.com`).
2. Copy the **Client Secret**.

---

## 3. GitHub OAuth App Configuration

GitHub authentication uses the Web Application Flow:
1. User clicks "Sign in with GitHub" -> redirected to `https://github.com/login/oauth/authorize`.
2. User authorizes -> redirected back to `${origin}/oauth-callback?code=...`.
3. Client/Backend exchanges the `code` for an access token via `/api/auth/github`.

### Step 1: Create GitHub OAuth App
1. Log in to GitHub and navigate to:
   **Settings** > **Developer Settings** > **OAuth Apps** > **New OAuth App**
   (Direct link: `https://github.com/settings/applications/new`).

### Step 2: Fill in Application Details
- **Application name**: `WiraDev Web Application`
- **Homepage URL**:
  - Production: `https://<your-project>.vercel.app`
  - Local testing: `http://localhost:3000`
- **Application description**: `WiraDev developer career & skills preparation platform.`
- **Authorization callback URL**:
  - Production: `https://<your-project>.vercel.app/oauth-callback`
  - Local testing: `http://localhost:3000/oauth-callback`

*(Note: If supporting both localhost and Vercel in GitHub, you can create two separate OAuth Apps, e.g. `WiraDev Local` and `WiraDev Production`, or update the callback URL accordingly).*

### Step 3: Generate Client Secret
1. Click **Register application**.
2. Copy the **Client ID**.
3. Under **Client secrets**, click **Generate a new client secret** and copy it securely.

---

## 4. Vercel Project Deployment Setup

### Step 1: Import Project into Vercel
1. Log in to [Vercel](https://vercel.com/) and click **Add New...** > **Project**.
2. Select your repository: `cipta77/WiraDev`.

### Step 2: Configure Project Settings
- **Framework Preset**: `Next.js`
- **Root Directory**: Click *Edit* and select `wiradev-fe`.
- **Build Command**: Default (`next build` or `pnpm run build`).
- **Output Directory**: Default (`.next`).
- **Install Command**: Default (`pnpm install`).

### Step 3: Configure Environment Variables
Under **Environment Variables**, add the following keys for `Production`, `Preview`, and `Development`:

| Variable Name | Recommended Value | Purpose |
|---------------|-------------------|---------|
| `BACKEND_URL` | `https://wirakarsa.infinitelearningstudent.id` | Target server for Next.js API & uploads reverse proxy |
| `NEXT_PUBLIC_API_URL` | `""` (empty string) | Allows frontend to use same-origin proxy `/api` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | `159334240812-3k5m6m19u2h5uljs0t5rckauajkovgel.apps.googleusercontent.com` | Google OAuth 2.0 Web Client ID |
| `NEXT_PUBLIC_GITHUB_CLIENT_ID` | `<your_github_client_id>` | GitHub OAuth App Client ID |

### Step 4: Deploy
Click **Deploy**. Vercel will install dependencies using `pnpm`, execute TypeScript compilation, bundle the assets, and deploy to your production URL.

---

## 5. Verification & Testing Procedures

### Local Automated Verifications

1. **Frontend TypeScript & Linting Check**:
   ```bash
   cd wiradev-fe
   pnpm exec tsc --noEmit
   pnpm run lint
   ```
   *Expected outcome: 0 compilation errors and 0 linting errors.*

2. **Backend Unit & Route Tests**:
   ```bash
   cd wiradev-be
   pnpm test
   pnpm run build
   ```
   *Expected outcome: All tests in `test/**/*.test.ts` pass, TypeScript build outputs clean JS in `dist/`.*

3. **Full End-to-End Test Suite**:
   ```bash
   cd .. # root WiraDev workspace
   node tests/e2e/runner.mjs
   ```
   *Expected outcome: 106/106 tests pass (100% success rate across Tier 1 Feature Coverage, Tier 2 Boundaries, Tier 3 Combinations, and Tier 4 Real-World User Journeys).*

### Production Smoke Test Checklist

- [ ] **Home & Landing Navigation**: Open `https://<your-project>.vercel.app`, verify assets and styling load without console errors.
- [ ] **Google Sign-In Popup**: Click Google Sign-in, confirm Google One Tap / popup opens without `Cross-Origin-Opener-Policy` warnings.
- [ ] **GitHub OAuth Flow**: Click Sign-in with GitHub, confirm browser redirects to `github.com/login/oauth/authorize` and returns cleanly to `/oauth-callback`.
- [ ] **Cookie Persistence**: Inspect Application > Cookies in DevTools; verify `access_token` and `refresh_token` are set on the Vercel domain.
- [ ] **Protected Dashboard Hydration**: Confirm `/api/auth/me` returns 200 OK with authenticated user profile and redirects to dashboard.
- [ ] **Logout Flow**: Click Logout; confirm cookies and `localStorage` tokens are cleared, and user returns to `/signin`.
