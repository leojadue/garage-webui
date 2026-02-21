# CLAUDE.md - Garage WebUI Fork

## Project Overview

Fork de [khairul169/garage-webui](https://github.com/khairul169/garage-webui) (MIT License).
Interfaz web para administrar [Garage](https://garagehq.deuxfleurs.fr/) S3-compatible object storage.

## Stack

- **Frontend:** React + TypeScript + Tailwind CSS
- **Backend:** Go (proxy al Garage Admin API)
- **Build:** Vite + pnpm
- **Docker:** `khairul169/garage-webui:latest`

## Relacion con Ecosistema

Este proyecto es la WebUI para el servicio Garage desplegado en OCI Free Tier:
- **Repo infra:** `~/Documents/Code/2025Contenedores/oracle-cloud-free-tier/`
- **Config:** `iac/05-workloads/garage.toml`
- **Dominio Garage S3:** `gs3.xgoldit.com`
- **Dominio WebUI:** `garage.xgoldit.com`

## Features Existentes (v1.1.0)

- Cluster health/status
- Listar/crear/eliminar buckets
- Object browser (subir/descargar/eliminar)
- Crear/eliminar access keys
- Asignar permisos key-bucket

## Features Planificadas para el Fork

Ordenadas por prioridad (valor + complejidad):

| # | Feature | Complejidad | Valor |
|---|---------|-------------|-------|
| 1 | Generar presigned URL (share temporal) | Media | Muy alto |
| 2 | Boton "Compartir" con link de descarga | Media | Muy alto |
| 3 | Renombrar objeto (CopyObject+DeleteObject) | Baja | Alto |
| 4 | Toggle bucket publico/privado | Baja | Alto |
| 5 | Mover objeto entre buckets | Media | Alto |
| 6 | Mover objeto entre "carpetas" virtuales | Media | Alto |
| 7 | Eliminar multiples objetos (checkbox) | Baja | Medio |
| 8 | Crear "carpeta" virtual | Baja | Medio |
| 9 | Preview de archivos (img/txt/pdf) | Media | Medio |
| 10 | Dashboard metricas con graficos | Media-Alta | Medio |
| 11 | UI para reglas de expiracion | Media | Bajo |

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

## Common Commands

```bash
# Instalar dependencias frontend
cd frontend && pnpm install

# Dev mode frontend
cd frontend && pnpm dev

# Build frontend
cd frontend && pnpm build

# Build Go backend
go build -o garage-webui .

# Docker build
docker build -t garage-webui .
```

## Upstream Sync

```bash
git fetch upstream
git merge upstream/main
```
