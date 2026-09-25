# DiskViz — Windows Disk Usage Visualization

![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)
![Python 3.12+](https://img.shields.io/badge/python-3.12+-blue)
![React Router v7](https://img.shields.io/badge/react%20router-v7-61dafb)

A real-time disk storage analyzer for **Windows** with an interactive treemap, charts, duplicate detection, and file analysis.

Scan a drive or folder once, then explore usage through a drillable treemap, extension breakdown, large/old file analysis, a virtualized 100k+-row file browser, and 3-stage duplicate detection.

> ⚠️ **Windows-only.** The scanner uses Windows long-path (`\\?\`) handling and the drive picker enumerates `A:`–`Z:` volumes.

## Features

- 📊 **Interactive Treemap** — click any folder to drill 3 fresh levels deep; served from a persistent cache after the first view
- ⚡ **Real-time Scanning** — WebSocket streaming: live progress, file counts, and recent-file feed while scanning
- 🍩 **Extension Breakdown** — donut chart of disk usage by file type
- 🗂️ **File Browser** — virtualized table (100k+ rows) with sorting & filtering
- 🔍 **Duplicate Detection** — 3-stage pipeline (size → partial hash → full hash) using `xxhash`
- 📈 **Large File Finder** — top-N biggest files with a horizontal bar chart
- 📅 **Old File Analysis** — files untouched for N days (default: 1 year)
- 💾 **Streaming Export** — CSV and NDJSON, streamed without loading the whole set into memory
- 🌙 **Dark Mode** — default dark theme (shadcn/ui)

## Tech Stack

| Layer | Technology |
|:---|:---|
| Backend | FastAPI + Uvicorn, SQLite (WAL), WebSocket |
| Scanning | `os.scandir()` iterative walk (symlink-skipping, `\\?\` long paths) |
| Hashing | `xxhash` `xxh3_64` — size → partial → full hash dedupe |
| Frontend | React Router v7, React 19, Tailwind CSS v4, shadcn/ui |
| Charts | Apache ECharts 5 (canvas) |
| Tables | TanStack Table v8 + TanStack Virtual v3 |

## Quick Start

### Prerequisites

- **Windows**
- Python 3.12+ and [uv](https://docs.astral.sh/uv/)
- Node.js 18+

### 1. Install dependencies

```powershell
# Backend (repo root)
uv sync

# Frontend
cd frontend
npm install
```

### 2. Start both servers

**Terminal 1 — Backend (port 8000):**
```powershell
uv run python run.py
```

**Terminal 2 — Frontend (port 5173):**
```powershell
cd frontend
npm run dev
```

### 3. Open the app

Navigate to **http://localhost:5173**, pick a drive (or browse to a folder), and start a scan.

### Production build

```powershell
cd frontend
npm run build
npm run start   # serves the built SPA (Vite preview)
```

## Project Structure

```
├── backend/            # FastAPI app
│   ├── routers/        #   drives, scans, analysis, duplicates, export
│   ├── scanner/        #   filesystem walker + xxhash hasher
│   ├── ws/             #   WebSocket scan endpoint
│   └── database.py     #   SQLite (WAL) + schema (scans, files, treemap_cache)
├── frontend/           # React Router v7 SPA
│   └── app/            #   routes, components, context, lib
├── dedupe_scans.py     # safe one-off helper to prune duplicate scans (dry-run by default)
├── run.py              # backend entry point
└── diskviz.db*         # runtime data (git-ignored)
```

## API Endpoints

| Endpoint | Description |
|:---|:---|
| `GET /api/drives` | List drives with usage |
| `GET /api/browse?path=` | Browse directories (`has_children`) |
| `GET /api/scans` · `GET /api/scans/:id` · `DELETE /api/scans/:id` | Scan history / detail / delete |
| `GET /api/scans/:id/stats` | Summary statistics |
| `GET /api/scans/:id/treemap?depth=3[&path=folder]` | Treemap tree; `path` roots the tree inside a subfolder (drill-down), cached for completed scans |
| `GET /api/scans/:id/extensions?limit=15` | Extension breakdown |
| `GET /api/scans/:id/large-files?limit=50` | Largest files |
| `GET /api/scans/:id/old-files?days=365` | Old/unmodified files |
| `POST /api/scans/:id/duplicates/start` · `GET .../duplicates` · `GET .../duplicates/status` | Duplicate detection lifecycle |
| `GET /api/scans/:id/export/csv` · `.../export/json` | Streaming export (NDJSON) |
| `WS /ws/scan` | Live scan stream (`started` / `batch` / `done` / `error` / `cancelled`) |

## License

[MIT](LICENSE) © 2026 CLLFTVTV