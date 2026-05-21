# API Endpoint Configuration

> How the BoomerBill frontend resolves which API server to talk to — and how to override it for self-hosting.

## Why This Matters

The BoomerBill frontend is a static Astro + Vue 3 PWA. It needs to know where the backend API lives so it can authenticate users, sync sessions, and fetch data. By default it points to `https://api.boomerbill.net`, but self-hosters need to point it at their own server.

This document explains how endpoint resolution works, how to configure it at each layer, and how to troubleshoot connection issues.

---

## How Endpoint Resolution Works

The frontend uses a **4-level precedence chain** to determine the API base URL. The first available value wins:

| Priority | Source | Mechanism | Persistence |
|----------|--------|-----------|-------------|
| **1** (highest) | User override | `localStorage` key `bb_api_endpoint_override` | Survives page reloads, per-browser |
| **2** | Runtime config | `window.__BOOMERBILL_API_URL__` global variable | Set in HTML before app loads |
| **3** | Build-time env | `import.meta.env.PUBLIC_API_BASE_URL` | Baked into the build at compile time |
| **4** (lowest) | Hard default | `https://api.boomerbill.net` | Always available fallback |

### Resolution Logic

```
resolveApiBaseUrl():
  1. Is there a value in localStorage["bb_api_endpoint_override"]? → use it
  2. Is window.__BOOMERBILL_API_URL__ defined? → use it
  3. Is PUBLIC_API_BASE_URL set at build time? → use it
  4. Fall back to "https://api.boomerbill.net"
```

Once resolved, the URL is **normalized**: leading/trailing whitespace is trimmed and all trailing slashes are removed. For example, `https://api.example.com/` becomes `https://api.example.com`.

### Which Source Is Active?

The Settings page displays a badge next to the active endpoint showing which source is in effect:

| Badge Label | Meaning |
|-------------|---------|
| **User override** | You set a custom URL in the Settings UI |
| **Runtime config** | The hosting HTML injects `window.__BOOMERBILL_API_URL__` |
| **Build-time config** | `PUBLIC_API_BASE_URL` was set when you ran `npm run build` |
| **Default** | No override is configured; using `https://api.boomerbill.net` |

---

## Default Endpoint

```
https://api.boomerbill.net
```

This is the official BoomerBill API server. If you are using the hosted frontend and want to connect to the official backend, you don't need to change anything.

---

## Validation Rules

When you enter or configure an API endpoint, the following validation rules apply:

### Always Enforced

| Rule | Description |
|------|-------------|
| **Valid URL format** | Must parse as a valid URL (e.g., `https://api.example.com`) |
| **HTTP or HTTPS only** | Other protocols (ftp, file, etc.) are rejected |
| **Non-empty** | Blank values are rejected |

### Production Context

When the app detects it is running in a **production context** (Astro `import.meta.env.PROD === true`, or the page hostname is not `localhost`, `127.0.0.1`, or `::1`):

| Rule | Description |
|------|-------------|
| **HTTPS required** | The endpoint URL **must** use `https://` |
| **Exception: localhost** | If the endpoint hostname is `localhost`, `127.0.0.1`, or `::1`, HTTP is allowed even in production context |

### Development Context

When running locally (`npm run dev` on `localhost:4321`):

| Rule | Description |
|------|-------------|
| **HTTP allowed** | Both `http://` and `https://` endpoints are accepted |
| **Typical setup** | `http://localhost:8000` pointing to a local Django dev server |

---

## Test Connection Button

The Settings page includes a **Test Connection** button that verifies the endpoint is reachable before you save it.

### What It Does

1. Sends a `GET` request to `<endpoint>/api/health/`
2. Uses a **10-second timeout**
3. Runs in **CORS mode** (requires the backend to allow cross-origin requests from your frontend origin)

### Possible Results

| Result | Meaning |
|--------|---------|
| **Connection successful!** | The server responded with a 2xx or 4xx status (server is reachable) |
| **Server returned HTTP 5xx** | The server responded with a 5xx error (server is up but unhealthy) |
| **Connection timed out after 10 seconds** | No response within the timeout window |
| **Could not reach the endpoint** | Network error (DNS failure, CORS blocked, offline, etc.) |

### Important Notes

- A **4xx response** (e.g., 404) is treated as **success** because it proves the server is reachable. The health endpoint path may differ on custom backends.
- A **5xx response** is treated as **failure** because it indicates a server-side problem.
- If you're self-hosting, ensure your backend's CORS configuration includes your frontend's origin, otherwise the browser will block the request and the test will fail.

---

## Reset to Default Button

The **Reset to default** button appears only when a user override is active (i.e., when the source badge shows "User override").

### What It Does

1. Removes the `bb_api_endpoint_override` key from `localStorage`
2. Clears the input field in the Settings UI
3. Displays a confirmation message: `API endpoint reset to default: https://api.boomerbill.net`
4. The message auto-dismisses after 5 seconds

### After Reset

The endpoint resolution falls through to the next available source in the precedence chain. If no runtime config or build-time env is set, the hard default (`https://api.boomerbill.net`) becomes active.

---

## Deployment Examples

### 1. Local Development

No configuration needed. The dev server runs on `http://localhost:4321` and the frontend defaults to `https://api.boomerbill.net`.

To point at a local backend:

```bash
# Option A: Set build-time env (requires rebuild)
PUBLIC_API_BASE_URL=http://localhost:8000 npm run build

# Option B: Set at runtime in your HTML
# Add this to your HTML <head>, before the app scripts:
<script>window.__BOOMERBILL_API_URL__ = "http://localhost:8000";</script>

# Option C: Use the Settings UI
# Open Settings → Change endpoint → enter http://localhost:8000 → Test Connection → Save
```

### 2. VPS / Self-Hosted (Static Files)

Serve the built `dist/` directory with Nginx, Caddy, or any static file server. Inject the runtime config:

```html
<!-- In your index.html, before the app script tags -->
<script>
  window.__BOOMERBILL_API_URL__ = "https://api.yourdomain.com";
</script>
```

Or set the build-time environment variable before building:

```bash
PUBLIC_API_BASE_URL=https://api.yourdomain.com npm run build
```

Then deploy the `dist/` folder to your server.

### 3. Netlify

The project includes a `netlify.toml` at the repository root. Modify the `[build.environment]` section:

```toml
[build]
  base = "frontend"
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"
  PUBLIC_API_BASE_URL = "https://api.yourdomain.com"
```

You can also set `PUBLIC_API_BASE_URL` as a **Netlify environment variable** in the Netlify dashboard (Site settings → Build & deploy → Environment) for per-deployment control without editing the TOML file.

### 4. Docker

Build the frontend with the environment variable:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
ARG PUBLIC_API_BASE_URL=https://api.yourdomain.com
ENV PUBLIC_API_BASE_URL=${PUBLIC_API_BASE_URL}
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Optional: inject runtime config via envsubst
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

Build and run:

```bash
docker build --build-arg PUBLIC_API_BASE_URL=https://api.yourdomain.com -t boomerbill-frontend .
docker run -p 80:80 boomerbill-frontend
```

---

## Troubleshooting

### "Could not reach the endpoint"

**Possible causes:**
- The URL is incorrect or the server is down
- **CORS is not configured** on your backend — the browser blocks cross-origin `fetch` requests
- Mixed content: you're serving the frontend over HTTPS but the endpoint uses HTTP (browsers block this)

**Fix:**
1. Verify the URL is correct and the backend is running
2. Check your backend's CORS settings — it must allow requests from your frontend's origin
3. Ensure both frontend and backend use HTTPS (or both use HTTP on localhost)

### "HTTPS is required for the API endpoint in production"

**Cause:** You entered an `http://` URL while the frontend is running in production context (not on localhost).

**Fix:**
- Use `https://` for your endpoint URL
- Or, if you're testing locally, access the frontend via `http://localhost:4321` instead of a production hostname

### Endpoint changes don't persist after page reload

**Cause:** You may have a build-time env or runtime config that is overriding your user setting.

**Fix:**
1. Check the source badge in Settings — if it says "Build-time config" or "Runtime config", the user override is being shadowed by a higher-priority source
2. Remove the `PUBLIC_API_BASE_URL` env variable or the `window.__BOOMERBILL_API_URL__` script tag to let the user override take effect

### Test Connection succeeds but app features don't work

**Cause:** The health endpoint (`/api/health/`) is reachable, but other API paths may have different CORS rules or authentication requirements.

**Fix:**
1. Open your browser's developer tools (F12) and check the **Network** tab for failed requests
2. Look for CORS errors or 401/403 responses
3. Verify your backend is configured to accept requests from your frontend origin for all API paths, not just the health endpoint

### "Connection timed out after 10 seconds"

**Cause:** The server is not responding within the 10-second timeout window.

**Fix:**
1. Verify the server is running and accessible from your network
2. Check for firewall rules blocking the connection
3. If the server is slow to respond, the health check may need to be optimized on the backend

### I want to use a different health endpoint path

The Test Connection button always hits `/api/health/`. If your self-hosted backend uses a different health check path, the test may fail even though the server is reachable. In this case:

1. A 4xx response from `/api/health/` is still treated as **success** (server is reachable)
2. Only 5xx responses and network errors are treated as failures
3. If the path returns 5xx or is completely unreachable, you can still save the endpoint — the test is advisory, not a gate

---

## Quick Reference

| Task | How |
|------|-----|
| Change endpoint in browser | Settings → Change endpoint → enter URL → Save |
| Reset to default | Settings → Reset to default (only visible when override is active) |
| Test before saving | Settings → Change endpoint → Test Connection |
| Set for all users at build time | `PUBLIC_API_BASE_URL=https://api.example.com npm run build` |
| Set at runtime via HTML | `<script>window.__BOOMERBILL_API_URL__ = "https://api.example.com";</script>` |
| Set for Netlify deploys | Edit `PUBLIC_API_BASE_URL` in `netlify.toml` or Netlify dashboard |
| Check which source is active | Look at the badge next to the endpoint in Settings |
| Clear user override manually | Open browser dev tools → Application → Local Storage → delete `bb_api_endpoint_override` |
