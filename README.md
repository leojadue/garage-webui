# Garage WebUI — XGOLD IT Fork

[![image](misc/img/garage-webui.png)](misc/img/garage-webui.png)

A customized admin web UI for [Garage](https://garagehq.deuxfleurs.fr/), a self-hosted, S3-compatible, distributed object storage service.

> **Fork of:** [khairul169/garage-webui](https://github.com/khairul169/garage-webui) (v1.1.0)
>
> **Upstream version:** 1.1.0 (commit `ee420fb`)
>
> **Fork maintainer:** [@leojadue](https://github.com/leojadue) — XGOLD IT

[ [Upstream Project](https://github.com/khairul169/garage-webui) | [Install Garage](https://garagehq.deuxfleurs.fr/documentation/quick-start/) | [Garage Docs](https://garagehq.deuxfleurs.fr/documentation/) | [Screenshots](misc/SCREENSHOTS.md) ]

---

## Why This Fork?

The upstream garage-webui is an excellent tool, but the **Share** feature generates static URLs that require wildcard DNS (`*.web.domain.com`) and S3 website access to be enabled on each bucket. This is impractical for many deployments.

This fork replaces the share mechanism with **S3 Presigned URLs** — time-limited, cryptographically signed links that work through the standard S3 API endpoint. No wildcard DNS, no website access configuration needed.

---

## Changes From Upstream

### 1. S3 Presigned URL Sharing (`be64941`)

**Problem:** The original share dialog generates static URLs like `http://bucket.web.domain.com/file.svg` which require:
- Wildcard DNS record (`*.web.domain.com`)
- Wildcard SSL certificate (DNS challenge)
- Website access enabled per bucket

**Solution:** New backend endpoint that generates S3 presigned URLs with configurable expiration.

**Backend — New file:** `backend/router/presign.go`
- `GET /api/presign/{bucket}/{key...}?expires=3600`
- Generates AWS Signature V4 presigned URLs via `s3.NewPresignClient`
- Expiration configurable: 15min to 7 days (default: 1 hour, max: 7 days)
- Uses existing per-bucket credential management (no extra config needed)
- Returns JSON: `{ url, expiresIn, method }`

**Frontend — Rewritten:** `src/pages/buckets/manage/browse/share-dialog.tsx`
- 7 expiration options: 15 minutes, 1 hour, 6 hours, 12 hours, 24 hours, 3 days, 7 days
- Auto-generates presigned URL when dialog opens
- **Copy link** button (clipboard)
- **Open in browser** button (new tab)
- Loading state and error handling
- No more "website access required" warning — works on any bucket

**Route registration:** `backend/router/router.go` — added 1 line

```
GET /api/presign/{bucket}/{key...}  →  Presign.GetPresignedURL
```

### 2. HTTPS Protocol Fix (`5f6b7d0`)

Changed hardcoded `http://` to `https://` in the share dialog URL construction. This fix is now superseded by the presigned URL feature but was the initial improvement.

---

## Upstream Features (Unchanged)

- Garage health status dashboard
- Cluster & layout management
- Create, update, or view bucket information
- Integrated objects/bucket browser with upload/download
- Create & assign access keys
- Authentication via bcrypt password hash
- Thumbnail generation for images
- Mobile-responsive UI

---

## Installation

### Docker Compose (Recommended)

```yml
services:
  garage:
    image: dxflrs/garage:v2.2.0
    container_name: garage
    volumes:
      - ./garage.toml:/etc/garage.toml
      - /mnt/data/garage/meta:/var/lib/garage/meta
      - /mnt/data/garage/data:/var/lib/garage/data
    restart: unless-stopped
    ports:
      - "3900:3900"   # S3 API
      - "3902:3902"   # S3 Web
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3903/v2/GetClusterHealth"]
      interval: 30s
      timeout: 5s
      retries: 3

  garage-webui:
    image: leojadue/garage-webui:latest
    container_name: garage-webui
    restart: unless-stopped
    ports:
      - "3909:3909"
    volumes:
      - ./garage.toml:/etc/garage.toml:ro
    environment:
      API_BASE_URL: "http://garage:3903"
      API_ADMIN_KEY: "${GARAGE_ADMIN_TOKEN}"
      S3_ENDPOINT_URL: "https://gs3.yourdomain.com"   # Public S3 endpoint for presigned URLs
      AUTH_USER_PASS: "${GARAGE_WEBUI_AUTH}"
    depends_on:
      garage:
        condition: service_healthy
```

> **Important:** `S3_ENDPOINT_URL` must be the **publicly accessible** S3 API URL (not the internal Docker hostname). Presigned URLs are generated with this endpoint and must be reachable by the end user's browser.

### Docker CLI

```sh
docker build -t leojadue/garage-webui:latest .

docker run -p 3909:3909 \
  -v ./garage.toml:/etc/garage.toml:ro \
  -e API_BASE_URL="http://garage:3903" \
  -e API_ADMIN_KEY="your-admin-token" \
  -e S3_ENDPOINT_URL="https://gs3.yourdomain.com" \
  -e AUTH_USER_PASS='admin:$2y$10$...' \
  --restart unless-stopped \
  --name garage-webui \
  leojadue/garage-webui:latest
```

### Build From Source

```sh
git clone https://github.com/leojadue/garage-webui.git
cd garage-webui && pnpm install
cd backend && go mod download && cd ..
pnpm run dev
```

---

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CONFIG_PATH` | No | `/etc/garage.toml` | Path to Garage configuration file |
| `API_BASE_URL` | No* | From garage.toml | Garage Admin API endpoint (internal) |
| `API_ADMIN_KEY` | No* | From garage.toml | Garage Admin API token |
| `S3_ENDPOINT_URL` | No* | From garage.toml | S3 API endpoint (**must be publicly accessible** for presigned URLs) |
| `S3_REGION` | No | `garage` | S3 region for signature |
| `AUTH_USER_PASS` | No | _(disabled)_ | `username:bcrypt_hash` for login |
| `BASE_PATH` | No | _(empty)_ | URL prefix for reverse proxy setups |
| `PORT` | No | `3909` | HTTP listen port |

> \* If `garage.toml` is mounted, these are read automatically. Env vars override the config file.

---

## API Endpoints

### Existing (Upstream)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login with username/password |
| POST | `/api/auth/logout` | Yes | Logout (clear session) |
| GET | `/api/auth/status` | Yes | Check auth status |
| GET | `/api/config` | Yes | Get Garage configuration |
| GET | `/api/buckets` | Yes | List all buckets |
| GET | `/api/browse/{bucket}` | Yes | List objects in bucket |
| GET | `/api/browse/{bucket}/{key}` | Yes | Get/view/download object |
| PUT | `/api/browse/{bucket}/{key}` | Yes | Upload object |
| DELETE | `/api/browse/{bucket}/{key}` | Yes | Delete object |
| * | `/api/*` | Yes | Proxy to Garage Admin API |

### Added by This Fork

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/presign/{bucket}/{key}?expires=N` | Yes | Generate presigned URL (N = seconds, max 604800) |

**Presign response:**
```json
{
  "url": "https://gs3.domain.com/bucket/key?X-Amz-Algorithm=AWS4-HMAC-SHA256&...",
  "expiresIn": 3600,
  "method": "GET"
}
```

---

## Architecture

```
┌──────────────────────────────────────────────────┐
│                   Browser                         │
│  garage.domain.com:3909                           │
└──────────┬──────────────────────────┬─────────────┘
           │ WebUI (React)            │ Presigned URL
           ▼                          ▼
┌──────────────────┐       ┌──────────────────┐
│  garage-webui    │       │   Garage S3 API  │
│  (Go backend)    │       │   gs3.domain.com │
│  Port 3909       │       │   Port 3900      │
│                  │       │                  │
│  /api/presign/   │───┐   │  AWS Sig V4 auth │
│  /api/browse/    │   │   │  Path-style URLs │
│  /api/buckets    │   │   └──────────────────┘
└──────────────────┘   │
        │              │
        │ Admin API    │ S3 SDK (presign)
        ▼              ▼
┌──────────────────────────┐
│      Garage Server       │
│      Port 3903 (Admin)   │
│      Port 3900 (S3 API)  │
│      Port 3902 (S3 Web)  │
└──────────────────────────┘
```

**Flow for presigned URLs:**
1. User clicks **Share** on a file in the WebUI
2. Frontend calls `GET /api/presign/{bucket}/{key}?expires=3600`
3. Go backend fetches per-bucket S3 credentials from Garage Admin API
4. Backend generates AWS Signature V4 presigned URL using `S3_ENDPOINT_URL`
5. Frontend displays the URL with copy/open buttons
6. Anyone with the URL can access the file directly via the S3 endpoint (no WebUI login needed)
7. URL expires after the configured duration

---

## Syncing With Upstream

This fork tracks [khairul169/garage-webui](https://github.com/khairul169/garage-webui) as `upstream`:

```sh
# Add upstream remote (one-time)
git remote add upstream https://github.com/khairul169/garage-webui.git

# Sync with upstream
git fetch upstream
git merge upstream/main

# Resolve conflicts if any (likely only in share-dialog.tsx)
```

### Files Modified From Upstream

| File | Change Type | Conflict Risk |
|------|-------------|---------------|
| `backend/router/presign.go` | **New file** | None |
| `backend/router/router.go` | +1 route line | Low |
| `src/pages/buckets/manage/browse/share-dialog.tsx` | Rewritten | Medium |
| `README.md` | Replaced | Low (intentional) |

---

## Tech Stack

- **Frontend:** React 18 + TypeScript 5.5 + Vite 5 + Tailwind CSS 3 + DaisyUI 4
- **Backend:** Go 1.23 + AWS SDK v2 + TOML parser
- **Container:** Multi-stage Docker build → `scratch` base (final image ~18MB)
- **Auth:** Session-based (alexedwards/scs) with bcrypt password hashing

---

## License

Same as upstream — see [khairul169/garage-webui](https://github.com/khairul169/garage-webui) for license details.
