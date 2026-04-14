# Docker Client Chunk Loading Error - Resolution Plan

## Error Observed

```
Loading chunk 8974 failed. (missing: http://localhost:3000/_next/static/chunks/app/page-2f546757acb3c416.js)
```

**Issue**: Browser is trying to load Next.js chunks (`_next/static/chunks`) but this is a **Vite app**, not Next.js.

## Root Cause Analysis

### Primary Cause: Browser Cache/Service Worker

The error indicates the browser has cached assets or service worker registrations from a **previous Next.js application** that ran on `localhost:3000`. When accessing the Vite app, the browser is attempting to load those cached Next.js chunks instead of the Vite application.

### Contributing Factors

1. **Browser Cache**: Previous Next.js app assets cached in browser
2. **Service Worker**: Next.js service worker may still be registered
3. **Port Reuse**: Same port (3000) used by different frameworks
4. **Docker Volume Mounts**: Potential stale build artifacts if `dist/` or `.next/` directories exist

## Immediate Resolution Steps

### Step 1: Clear Browser Cache & Service Workers

**Chrome/Edge:**
1. Open DevTools (F12)
2. Go to **Application** tab
3. **Service Workers** section → Click "Unregister" for any registered workers
4. **Storage** section → Click "Clear site data" (includes cache, localStorage, etc.)
5. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)

**Firefox:**
1. Open DevTools (F12)
2. Go to **Storage** tab
3. Right-click on `localhost:3000` → "Delete All"
4. Hard refresh: `Ctrl+Shift+R`

**Or use Incognito/Private Window:**
- Test in a fresh browser session to rule out cache issues

### Step 2: Verify Docker Container is Running Correctly

```bash
# Check if client container is running
docker ps | grep agentic-client

# Check client logs
docker logs agentic-client

# Should see Vite dev server output like:
# VITE v5.x.x  ready in XXX ms
# ➜  Local:   http://localhost:3000/
```

### Step 3: Verify Vite is Serving Correct Assets

Check what's actually being served:

```bash
# Check container logs for Vite output
docker logs -f agentic-client

# Should see Vite serving /src/main.jsx, not Next.js chunks
```

### Step 4: Check for Stale Build Artifacts

```bash
# Check if any Next.js build artifacts exist
cd client
ls -la | grep -E "\.next|dist|build"

# If .next directory exists, remove it
rm -rf .next
```

### Step 5: Restart Docker Containers

```bash
# Stop containers
docker compose down

# Remove any volumes (if needed)
docker compose down -v

# Rebuild and start
docker compose up --build
```

## Long-Term Prevention

### 1. ✅ Add Cache-Busting Headers in Vite Config (APPLIED)

Updated `client/vite.config.js` with cache-busting headers:

```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 3000,
    strictPort: false,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_TARGET || 
                (process.env.DOCKER_ENV === 'true' ? 'http://server:3001' : 'http://localhost:3001'),
        changeOrigin: true,
      },
    },
  },
});
```

### 2. ✅ Add .dockerignore to Prevent Stale Artifacts (APPLIED)

Updated `client/.dockerignore` to exclude Next.js artifacts:

```
node_modules
dist
.next
build
.cache
*.log
```

### 3. ✅ Add HTML Meta Tags to Prevent Caching (APPLIED)

Updated `client/index.html` with cache-busting meta tags:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  <title>Agentic React App</title>
</head>
```

### 4. Verify Docker Container Health

Check that Vite is actually running:

```bash
# Check container logs
docker logs agentic-client

# Expected output:
# > agentic-client@1.0.0 dev
# > vite --host 0.0.0.0 --port 3000
# 
#   VITE v5.x.x  ready in XXX ms
#   ➜  Local:   http://localhost:3000/
#   ➜  Network: http://172.x.x.x:3000/
```

## Diagnostic Commands

### Check What's Actually Being Served

```bash
# From host machine, check what localhost:3000 serves
curl -I http://localhost:3000

# Should return HTML, not 404 for Next.js chunks
curl http://localhost:3000 | head -20

# Check if Vite HMR websocket is available
curl http://localhost:3000/@vite/client
```

### Check Docker Network

```bash
# Verify containers can communicate
docker exec agentic-client ping -c 2 server

# Check network connectivity
docker network inspect agentic-app-network
```

### Check Container File System

```bash
# Verify Vite files exist in container
docker exec agentic-client ls -la /app/src

# Should see: App.jsx, main.jsx, components/, styles/
```

## Alternative: Use Different Port

If cache issues persist, use a different port:

**docker-compose.yml:**
```yaml
client:
  ports:
    - "3002:3000"  # Map host 3002 to container 3000
```

Then access: `http://localhost:3002`

## Expected Behavior After Fix

1. **Browser loads**: `http://localhost:3000`
2. **HTML loads**: Shows "Agentic React App" title
3. **Vite serves**: `/src/main.jsx` and other Vite assets
4. **No Next.js references**: No `_next/static/chunks` in network tab
5. **HMR works**: Vite hot module replacement active

## Verification Checklist

- [ ] Browser cache cleared
- [ ] Service workers unregistered
- [ ] Docker container logs show Vite dev server
- [ ] `curl http://localhost:3000` returns HTML (not 404)
- [ ] Network tab shows Vite assets (`/src/main.jsx`, `/@vite/client`)
- [ ] No `_next` paths in network requests
- [ ] Application loads and renders correctly

## Summary

**Root Cause**: Browser cache from previous Next.js app on same port

**Quick Fix**: Clear browser cache/service workers + hard refresh

**Long-Term Fix**: Add cache-busting headers, verify Docker setup, use different port if needed

**Status**: Browser-side issue, not a Docker/Vite configuration problem
