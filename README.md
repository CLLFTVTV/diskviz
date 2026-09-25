# DiskViz — Windows Disk Usage Visualization Tool

A real-time disk storage analyzer for Windows with an interactive treemap, charts, duplicate detection, and file analysis.

## Tech Stack

- **Backend**: FastAPI + SQLite (WAL mode) + os.scandir + xxhash
- **Frontend**: React Router v7 + Tailwind CSS v4 + shadcn/ui + Apache ECharts + TanStack Table

## Quick Start

### Prerequisites

- Python 3.12+
- Node.js 18+
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### 1. Install Backend Dependencies

```powershell
cd "D:\Projects\Memory Management"
uv sync
```

### 2. Install Frontend Dependencies

```powershell
cd frontend
npm install
```

### 3. Start Both Servers

**Terminal 1 — Backend (port 8000):**
```powershell
cd "D:\Projects\Memory Management"
uv run python run.py
```

**Terminal 2 — Frontend (port 5173):**
```powershell
cd "D:\Projects\Memory Management\frontend"
npm run dev
```

### 4. Open the App

Navigate to **http://localhost:5173** in your browser.

## Features

- 📊 **Interactive Treemap** — Click to drill down into directory structures (ECharts canvas-based)
- 🍩 **Extension Breakdown** — Donut chart showing disk usage by file type
- 📁 **File Browser** — Virtualized table handling 100k+ files with sorting & filtering
- 🔍 **Duplicate Detection** — 3-stage pipeline (size → partial hash → full hash) using xxhash
- 📈 **Large File Finder** — Top N biggest files with horizontal bar chart
- 📅 **Old File Analysis** — Find files not modified in 1+ year
- ⚡ **Real-time Scanning** — WebSocket streaming with live progress updates
- 💾 **Export** — Streaming CSV and NDJSON export
- 🌙 **Dark Mode** — Default dark theme with shadcn/ui

## API Endpoints

| Endpoint | Description |
|:---|:---|
| `GET /api/drives` | List available drives |
| `GET /api/browse?path=` | Browse directories |
| `GET /api/scans` | List scan history |
| `GET /api/scans/:id/stats` | Scan summary statistics |
| `GET /api/scans/:id/treemap?depth=3` | Hierarchical treemap data |
| `GET /api/scans/:id/extensions` | Extension breakdown |
| `GET /api/scans/:id/large-files` | Top N largest files |
| `GET /api/scans/:id/old-files?days=365` | Old files |
| `GET /api/scans/:id/duplicates` | Duplicate file groups |
| `GET /api/scans/:id/export/csv` | Streaming CSV export |
| `GET /api/scans/:id/export/json` | Streaming NDJSON export |
| `WS /ws/scan` | Real-time scan streaming |
