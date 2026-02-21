# CLAUDE.md - Garage WebUI Fork

## Project Overview

Fork de [khairul169/garage-webui](https://github.com/khairul169/garage-webui) (MIT License).
Interfaz web para administrar [Garage](https://garagehq.deuxfleurs.fr/) S3-compatible object storage.

## Stack

- **Frontend:** React 18 + TypeScript + Tailwind CSS + DaisyUI + TanStack React Query
- **Backend:** Go 1.23 (proxy al Garage Admin API + S3 operations via AWS SDK)
- **Database:** SQLite via `modernc.org/sqlite` (pure Go, no CGO)
- **Sessions:** `alexedwards/scs/v2` (SQLite-backed in multi-user mode, in-memory in legacy)
- **Build:** Vite + pnpm (frontend), `CGO_ENABLED=0 go build` (backend)
- **Docker:** Multi-stage build → `scratch` base image

## Relacion con Ecosistema

Este proyecto es la WebUI para el servicio Garage desplegado en OCI Free Tier:
- **Repo infra:** `~/Documents/Code/2025Contenedores/oracle-cloud-free-tier/`
- **Config:** `iac/05-workloads/garage.toml`
- **Dominio Garage S3:** `gs3.xgoldit.com`
- **Dominio WebUI:** `garage.xgoldit.com`

## Architecture

### Multi-User RBAC (DATA_DIR mode)

```
DATA_DIR set?
  ├─ YES → SQLite mode: migrations, multi-user, role-based routes
  │        First boot: auto-create admin user from AUTH_USER_PASS env
  │        Session store: SQLite persistent
  └─ NO  → Legacy mode: identical to upstream behavior
           Single user from AUTH_USER_PASS env
           Session store: in-memory (SCS default)
```

### 3 Fixed Roles
- **admin** (level 3): Full access — cluster, keys, users, lifecycle write, Garage Admin API proxy
- **editor** (level 2): Upload, delete, rename, move objects
- **viewer** (level 1): Browse, download, preview, share (read-only)

### Route → Role Mapping
| Method | Route | Min Role |
|--------|-------|----------|
| GET | /browse/*, /presign/*, /zip/* | viewer |
| PUT/DELETE | /browse/*, POST /objects/copy | editor |
| POST/DELETE | /lifecycle/* | admin |
| GET/POST/PUT/DELETE | /users/* | admin (except self password) |
| / (proxy) | Garage Admin API | admin |

### Key Files
```
backend/
├── main.go                          # Entry point, dual mode init
├── store/
│   ├── db.go                        # SQLite init + migration runner
│   ├── session_store.go             # SCS-compatible SQLite session store
│   ├── user_store.go                # User CRUD + EnsureAdminFromEnv
│   ├── role_store.go                # Role queries
│   └── migrations/001_initial.sql   # Schema + seed roles
├── models/user.go                   # User, Role, SessionUser types
├── middleware/
│   ├── auth.go                      # Dual-mode auth (DB or legacy)
│   └── role.go                      # RequireRole middleware
├── router/
│   ├── router.go                    # Route registration with role gating
│   ├── auth.go                      # Login/Logout/GetStatus (dual mode)
│   └── users.go                     # User CRUD endpoints
└── utils/session.go                 # Session manager with user context

src/
├── hooks/
│   ├── useAuth.ts                   # Auth query (user, role, multi_user)
│   └── usePermission.ts            # Role-based permission flags
├── components/ui/
│   ├── role-badge.tsx               # Role-colored badge
│   └── permission-guard.tsx         # Conditional render by role
└── pages/users/                     # Admin user management page
```

## Features Implemented

### Core (from upstream)
- Cluster health/status
- Listar/crear/eliminar buckets
- Object browser (subir/descargar/eliminar)
- Crear/eliminar access keys
- Asignar permisos key-bucket

### Fork Additions (v2.0)
1. Presigned URL generation (share temporal)
2. Object rename (CopyObject+DeleteObject)
3. Object move between buckets/folders
4. Multi-select bulk delete
5. Create virtual folders
6. File preview (img/txt/pdf)
7. Lifecycle rules management
8. Download as ZIP
9. Basic auth (AUTH_USER_PASS)
10. **Multi-user RBAC** (admin/editor/viewer roles, SQLite)

## APIs Disponibles

### Garage Admin API (puerto 3903)
- `GET /v2/GetClusterStatus` / `GET /v2/GetClusterHealth`
- `POST /v2/ListBuckets` / `POST /v2/CreateBucket` / `POST /v2/DeleteBucket`
- `POST /v2/GetBucketInfo` (bytes, keys count)
- `POST /v2/ListKeys` / `POST /v2/CreateKey` / `POST /v2/DeleteKey`
- `POST /v2/AllowBucketKey` / `POST /v2/DenyBucketKey`
- `POST /v2/SetBucketLifecycleConfiguration`
- `POST /v2/SetBucketWebsite`
- `GET /metrics` (Prometheus format)

### S3 API (puerto 3900)
- ListObjects, GetObject, PutObject, DeleteObject, CopyObject
- Presigned URLs (S3 v4 signature)

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `API_BASE_URL` | Yes | Garage Admin API URL (e.g., `http://garage:3903`) |
| `S3_ENDPOINT_URL` | Yes | Garage S3 API URL (e.g., `http://garage:3900`) |
| `AUTH_USER_PASS` | No | `username:bcrypt_hash` for auth |
| `DATA_DIR` | No | Enable multi-user mode (e.g., `/data`) |
| `BASE_PATH` | No | URL prefix (e.g., `/webui`) |
| `HOST` | No | Listen address (default: `0.0.0.0`) |
| `PORT` | No | Listen port (default: `3909`) |

## Common Commands

```bash
# Docker build
docker build -t garage-webui .

# Docker run (multi-user mode)
docker run -e DATA_DIR=/data -e AUTH_USER_PASS='admin:$2a$10$...' -v webui-data:/data garage-webui
```

## Upstream Sync

```bash
git fetch upstream
git merge upstream/main
```
