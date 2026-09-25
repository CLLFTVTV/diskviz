# DiskViz — Project Reference (for AI assistants)

> Self-contained reference for future work sessions on this project. Built 2026-09-20 in a Gemini
> Antigravity session (`C:\Users\CLLFT\.gemini\antigravity\`, conversation `9754449a-d176-44c6-95ae-3d1e0f20abe7`).
> Written from a full decode of the build trajectory + code inventory.

## 1. What the project is

**DiskViz** — a Windows disk-usage visualization tool. Think WinDirStat meets a modern web dashboard.
Scan a drive/folder, then explore usage via an interactive treemap, extension donut chart, large/old
file analysis, a virtualized file browser, and duplicate-file detection (3-stage hashing).

Original user ask: *"Make a tool to visualize memory usage on windows. File counts, extensions,
names, directories etc. FastAPI back end, react front end (Remix or React Router). Ask any and all
questions to best understand the project."*

### Decisions locked in during planning (user answers)
1. **SPA** (not SSR)
2. **SQLite DB file** for metadata
3. **Dark mode** — yes
4. **Analysis only** for now (no delete/cleanup actions)
5. **PDF reports** — deferred

## 2. Tech stack

| Layer | Technology |
|:---|:---|
| Backend | FastAPI + Uvicorn (port 8000), REST + WebSocket |
| Scan | `os.scandir()` (iterative, symlink-skipping, `\\?\` long-path prefix) |
| Store | SQLite, WAL mode, thread-local connections, in-memory temp store |
| Hashing | `xxhash` `xxh3_64`, 3-stage duplicate detection (size → partial → full) |
| Serialization | `orjson` |
| Frontend | React Router v7 (framework mode, SPA: `react-router.config.ts` → `{ ssr: false }`), React 19 |
| Styling | Tailwind CSS v4 + 14 shadcn/ui primitives |
| Charts | Apache ECharts 5 (canvas) |
| Table | TanStack Table v8 + TanStack Virtual v3 |

## 3. Directory / file inventory

### Root (`D:\projects\Memory Management`)
| Path | Purpose / Notes |
|:---|:---|
| `pyproject.toml` | Project `diskviz`, deps: `aiofiles, fastapi, orjson, uvicorn[standard], websockets, xxhash`; hatchling wheel with `packages = ["backend"]` |
| `uv.lock` | Lockfile |
| `run.py` | Backend entry: `uvicorn.run("backend.main:app", host=0.0.0.0, port=8000, reload=True, reload_dirs=["backend"])` |
| `README.md` | Quick-start + feature list (accurate) |
| `implementation_plan.md` | Original plan (copy of brain doc) |
| `check_db.py` | ⚠️ **Destructive**: `DELETE FROM files; DELETE FROM scans` — cleanup helper, not inspection anymore |
| `dedupe_scans.py` | **Safe dedupe (dry-run by default)**: keeps the newest scan per `root_path`, explicitly deletes older scans + their `files`/`treemap_cache` rows. Run `uv run python dedupe_scans.py` (dry run) / `uv run python dedupe_scans.py --apply`. Used 2026-09-25 to collapse 8 duplicate `D:\` scans → 1 |
| `diskviz.db` (+ `-wal`, `-shm`) | SQLite data. **1 scan (`D:\`, 174,108 files) as of 2026-09-25 after dedupe.** Optional: `VACUUM` to reclaim free pages (file ~890 MB, free space not auto-reclaimed) |
| `scan_dc9191fa-6bfb-48f7-b798-d085c48ed774.json` | **0 bytes** — leftover from user's failed "analysis JSON" drop |
| `.venv/` | Root venv |
| `backend/` | See below |
| `frontend/` | See below |

### Backend (`backend/`)
| Path | Purpose |
|:---|:---|
| `config.py` | `DB_PATH` (env `DB_PATH`, default `./diskviz.db`), `SCAN_BATCH_SIZE=200`, `SCAN_FLUSH_INTERVAL=0.1`, `HASH_CHUNK_SIZE=65536`, CORS origins (5173) |
| `database.py` | `get_db()` thread-local sqlite conn (WAL, synchronous=NORMAL, temp_store=MEMORY, cache_size=-64000); `init_db()` / `close_db()`; schema `scans` + `files` + `treemap_cache` + indexes |
| `models.py` | Pydantic: `DriveInfo, ScanCreate, ScanResponse, FileEntry, TreemapNode, ExtensionStat, DuplicateGroup, ExportFormat` |
| `main.py` | App factory, lifespan (init/close db), CORS, mounts routers `drives, scans, analysis, duplicates, export` under `/api`, WebSocket `/ws/scan` |
| `scanner/filesystem.py` | `normalize_windows_path` (`\\?\` prefix for long paths) + `scan_directory` generator (iterative stack, skip symlinks, depth, parent_dir=relative, ext lowercased) |
| `scanner/hasher.py` | `compute_hash(path, chunk_size)`; `find_duplicates(scan_id, db_path, progress_callback, cancel_event)` — stage1: group by size; stage2: partial hash (first chunk); stage3: full hash of partial-match groups; upserts `partial_hash`/`full_hash` on `files` |
| `routers/drives.py` | `GET /api/drives` (A–Z, `shutil.disk_usage`, label="Local Disk"), `GET /api/browse?path=` (scandir dirs w/ `has_children`, ignores errors) |
| `routers/scans.py` | `GET /api/scans`, `GET /api/scans/{id}`, `DELETE /api/scans/{id}` |
| `routers/analysis.py` | `GET /api/scans/{id}/stats` (total_files/size, unique_ext, avg, oldest/newest mtime), `GET /api/scans/{id}/treemap?depth=3[&path=<folder>]` (tree rooted at the whole scan, or drilled into `path`; file nodes carry `is_file` + `extension`; **persistent cache**: `build_treemap()` helper + `treemap_cache` table — cold build ~0.3–2s per (scan,path,depth), warm reads ~6–60ms; only served for `status='done'` scans, trimmed to newest ~300 rows), `GET /api/scans/{id}/extensions?limit=15`, `GET /api/scans/{id}/large-files?limit=50`, `GET /api/scans/{id}/old-files?days=365` |
| `routers/duplicates.py` | `POST /api/scans/{id}/duplicates/start` (background thread via `active_duplicate_tasks`), `GET .../duplicates` (groups with wasted_space), `GET .../duplicates/status` (running/done) |
| `routers/export.py` | `GET /api/scans/{id}/export/csv`, `.../export/json` — streaming (fetchmany 1000, NDJSON) |
| `ws/scan_ws.py` | `scan_websocket`: accepts, creates scan row ('scanning'/'done'), sends `started`/`batch`/`done`/`error`/`cancelled` events; scanner runs in a worker thread → `asyncio.Queue`, persists batches with `executemany`; cancel via `threading.Event`. On completion it **pre-warms the whole-scan `treemap_cache` row** (best-effort, never fails the scan) |
| `__init__.py` | Package marker (added during integration) |
| `.gitignore`, `.python-version`, `uv.lock`, `pyproject.toml` | `pyproject.toml`: name `diskviz-backend`, `packages = ["."]`; **backend has its own empty git repo (0 commits)** |
| `src/diskviz_backend/__init__.py` | ⚠️ **Stale leftover** from `uv init`; unused (root pyproject packages `backend`, not `src`) |

### Frontend (`frontend/`)
| Path | Purpose |
|:---|:---|
| `package.json` | scripts: `dev` (`react-router dev`), `build`, `start`, `typecheck`; allowScripts `esbuild@0.25.12` |
| `vite.config.ts` | Tailwind v4 plugin + `reactRouter()`; **`resolve.alias "~" → ./app`** (added in integration fix); proxy `/api`→8000, `/ws`→8000 w/ ws |
| `react-router.config.ts` | `{ ssr: false }` (SPA) |
| `tsconfig.json` | strict, ES2022, bundler resolution, paths `~/*` |
| `.react-router/` | Generated typegen dir |
| `app/root.tsx` | HTML shell (dark class), sticky header w/ DiskViz nav, `ScanProvider` wraps `<Outlet/>` |
| `app/routes.ts` | `index home`, `scan`, `layout results` → `results/:id` (overview), `files`, `duplicates`, `large-files` |
| `app/routes/home.tsx` | Dashboard: hero + `DrivePicker` + recent scans table |
| `app/routes/scan.tsx` | `/scan?path=` → starts WebSocket scan via context; shows `ScanProgress`, recent files, then "View Analysis Results" |
| `app/routes/results.tsx` | Layout: scan header (path, files, size, duration) + Tabs + export DropdownMenu |
| `app/routes/results.overview.tsx` | Stats cards + `TreemapChart` + `ExtensionPie` + `SizeBarChart`. Effects split (2026-09-25): stats/extensions fetch once per `[id]`; treemap fetches per `[id, rootPath]` with an `AbortController` (rapid drill clicks cancel the stale in-flight request) |
| `app/routes/results.files.tsx` | Loads top 10,000 large files → `FileTable` |
| `app/routes/results.duplicates.tsx` | Start/results flow w/ status polling (2 s) |
| `app/routes/results.large-files.tsx` | Top 50 large + old files (365 d) with bar chart + table |
| `app/context/scan-context.tsx` | `useReducer` scan state machine (`idle→connecting→scanning→done/error/cancelled`); WebSocket lifecycle; `startScan`/`cancelScan`/`reset`. **Double-start guard (2026-09-25)**: `startScan` no-ops while a WS is already `CONNECTING`/`OPEN`, and the reducer ignores `START` while `connecting`/`scanning` — fixes the duplicate-scan bug caused by React Router v7 dev-mode StrictMode double-firing the effect in `scan.tsx` |
| `app/components/` | `drive-picker.tsx` (drive cards + folder-browse dialog), `scan-progress.tsx`, `stat-card.tsx`, `treemap-chart.tsx` (ECharts treemap: adaptive size units, sqrt-scaled layout so small files stay visible, files colored by extension, click-to-drill via refetch rooted at the clicked folder; navigation breadcrumb lives in `results.overview.tsx`; `animation: false` + `useMemo` on `transformData` for instant drill swaps), `extension-pie.tsx` (donut), `size-bar-chart.tsx` (horizontal bars), `file-table.tsx` (virtualized + filter + sort) |
| `app/components/ui/` | shadcn primitives: badge, button, card, dialog, dropdown-menu, input, progress, scroll-area, select, separator, table, tabs (12 files) |
| `app/hooks/use-echarts.ts` | ECharts init/dispose + ResizeObserver |
| `app/lib/api.ts` | Typed fetch client for all endpoints; `getTreemap(id, depth, path?, signal?)` supports an `AbortSignal` |
| `app/lib/format.ts` | `formatBytes`, `formatNumber`, `formatDate`, `formatDuration` — **null/NaN guards added in integration fix** |
| `app/lib/utils.ts` | `cn()` (clsx + tailwind-merge) |
| `app/app.css` | Tailwind import + shadcn dark theme vars |

## 4. API surface (summary)

- `GET  /api/drives` — drive list w/ usage
- `GET  /api/browse?path=` — dir listing w/ has_children
- `GET  /api/scans` · `GET /api/scans/{id}` · `DELETE /api/scans/{id}`
- `GET  /api/scans/{id}/stats` · `/treemap?depth=3[&path=]` (cached for done scans) · `/extensions?limit=15` · `/large-files?limit=50` · `/old-files?days=365`
- `POST /api/scans/{id}/duplicates/start` · `GET .../duplicates` · `GET .../duplicates/status`
- `GET  /api/scans/{id}/export/csv` · `/export/json` (NDJSON)
- `WS   /ws/scan` — JSON messages: receive `{path}`, send `started{scan_id}`, `batch{items, scanned, total_size}`, `done`, `error`, `cancelled`

## 5. DB schema

```sql
scans(id TEXT PK, root_path, status DEFAULT 'pending', total_files INT, total_size INT,
      started_at, completed_at)
files(id INTEGER PK AUTOINC, scan_id → scans(id) ON DELETE CASCADE,
      path, name, extension, size INT, mtime REAL, parent_dir, depth INT,
      partial_hash, full_hash)
treemap_cache(scan_id TEXT, path TEXT DEFAULT '', depth INT DEFAULT 3, tree TEXT, built_at TEXT,
              PRIMARY KEY (scan_id, path, depth))  -- pre-built treemap JSON for done scans
INDEX: files(scan_id), files(scan_id,size), files(scan_id,extension), files(scan_id,parent_dir), files(scan_id,mtime)
INDEX: treemap_cache(built_at)
```
Windows path semantics: stored values are **relative** paths (rel to root); `path` separator is `\`.

## 6. Build history / how we got here (Antigravity session)

1. User prompt → agent asked 5 clarifying questions → answers locked in §1.
2. 3 research subagents (FastAPI/WS best practices, React Router v7 setup, viz libraries).
3. `implementation_plan.md` + `task.md` written to brain; `code-builder` subagent defined.
4. Backend builder (`43a90c48`) and frontend builder (`3d305078`) ran in parallel:
   - Backend: full FastAPI app + scanner + hasher + WS + export (done, "imports OK, serves /api/drives").
   - Frontend: manual React Router v7 scaffold (interactive scaffolder failed → manual setup), all components/routes.
5. **Integration fixes by lead agent** (the real debugging work):
   - added `backend/__init__.py` (relative imports)
   - `routers/duplicates.py`: missing `status` endpoint was added
   - `hasher.py`: `db.fetchone()` → `cursor.fetchone()`
   - `filesystem.py`: `\\?\` long-path prefix escaping (took 2 attempts; final uses `prefix = "\\\\?\\"` + `sys.platform == 'win32'`)
   - root `pyproject.toml` (diskviz, packages=["backend"]) and backend `pyproject.toml` (hatchling, packages=["."])
   - `vite.config.ts`: added `resolve.alias "~"` (Vite couldn't resolve `~/...` imports)
   - `drive-picker.tsx`: **`D:\:` double-slash bug** — `drive.letter` already includes `:\`, but `onSelect(`${drive.letter}:\\`)` appended another `:\`; fixed to pass `drive.letter` directly; also fixed label duplication `({drive.letter}:)`
   - `format.ts`: null/NaN guards (was rendering `NaN undefined`)
6. Ran both servers (backend 8000, frontend 5173). First user test failed (see issue below). Lead agent rewrote `check_db.py` into a cleanup script, cleared the stale broken scans (`D:\:`, 0 files), and explained the root cause.
7. User: *"stop the server for now and await further instructions"* → both servers killed. **Session paused here.**

## 7. Known issues & open work (verify before/while continuing)

1. **End-to-end scan never re-verified.** The `D:\:` path fix landed, DB was cleared, but the user stopped the agent before a fresh browser scan was confirmed. `task.md` line "End-to-end test: scan a small directory in browser" is still **unchecked**.
2. **Duplicate-scan rows — FIXED (2026-09-25).** Root cause: React Router v7 framework mode enables **StrictMode in dev**, which double-fires the mount effect in `scan.tsx` → two `startScan` calls → two WS connections → two concurrent `D:\` scans (confirmed: 4 pairs of scans, each pair `started_at` milliseconds apart). Fix: `scan-context.tsx` now no-ops `startScan` while a WS is `CONNECTING`/`OPEN` and the reducer ignores `START` while `connecting`/`scanning`. DB cleaned via `dedupe_scans.py --apply` (8 scans → newest 1, freed 1,217,425 file rows). Verify a fresh scan creates exactly one row.
3. **Duplicate detection never exercised end-to-end** (hasher stage 2/3, status polling flow).
4. **Stray files**: `scan_dc9191fa-…json` (0 B — user's failed JSON export attempt), `backend/src/diskviz_backend/` (stale `uv init` artifact), `backend/.git` (empty repo, 0 commits — everything untracked). Root dir is **not** a git repo; consider `git init` at root + one `.gitignore` (venv, node_modules, diskviz.db*, `__pycache__`) and delete strays.
5. **`check_db.py` is destructive** — rename/adjust before it's run accidentally.
6. Minor correctness notes observed in code: `routers/analysis.py` treemap builds a prefix tree from *file* paths only (so empty dirs are invisible and nodes only exist where files exist); `drive-picker.tsx` drive label always `"Local Disk"` (no volume-label API); file browser loads only top-10k largest files, not the full set. Treemap changes (2026-09-25): now sends `is_file`/`extension` on file nodes, renders the full `depth=3` tree on load (no `leafDepth` restriction), sizes are layout-scaled by `size^0.5` (real bytes kept in `rawSize` and shown in labels/tooltips), `visibleMin: 3`, and file tiles are colored by extension. The old `leafDepth: 1` + `nodeClick: 'link'` combo was replaced by full-depth render + click-to-drill: clicking any folder tile re-fetches the treemap rooted at that folder (`/treemap?path=<folder>`, paths are scan-root-relative), giving 3 fresh levels each drill, with an in-app breadcrumb (`Scan root / …`) for navigation back up; the synthetic whole-scan container (`path='root'`) shows no upper label. The ECharts internal breadcrumb/zoom is disabled (`nodeClick: false`, `breadcrumb.show: false`).
7. **Perf pass (2026-09-25, done):** treemap endpoint was ~2.3 s per request (rebuilt the tree from 174k rows every time). Now: persistent `treemap_cache` table (JSON tree per `scan_id,path,depth`), served only for `done` scans, eagerly pre-warmed for the whole scan at scan completion; measured cold build ~1.3–2 s (first open of a location), warm reads **6–24 ms**. Frontend: overview effects split (stats once per scan, treemap per drill with `AbortController`), chart `animation: false` + `useMemo`. Typecheck clean (only the 3 pre-existing errors remain: radix `dropdown-menu` inset, missing `@radix-ui/react-table`, `vite.config.ts` node types).

## 8. How to run

```powershell
# Terminal 1 — backend (port 8000)
cd "D:\Projects\Memory Management"
uv sync
uv run python run.py

# Terminal 2 — frontend (port 5173)
cd "D:\Projects\Memory Management\frontend"
npm install
npm run dev
```
Open http://localhost:5173. (Vite proxies `/api` and `/ws` to :8000.)

## 9. Suggested next steps (in order)

1. **Confirm double-scan fix in browser**: run a fresh scan, then check `GET /api/scans` — exactly one new row per scan action (backend log should show one "WebSocket /ws/scan [accepted]" per click).
2. **Exercise duplicate detection** on a small folder; confirm `hasher.py` stage 2→3 updates and groups render on the duplicates tab.
3. **Optional DB housekeeping**: `VACUUM` `diskviz.db` to reclaim free pages from the 7 removed scans (file is ~890 MB but only holds 174k rows); run when the app isn't in active use (brief exclusive lock).
4. **File cleanups**: delete `scan_dc9191fa-…json` (0 B) & stale `backend/src`, decide fate of `backend/.git`, init a root git repo w/ proper `.gitignore`, keep `check_db.py` quarantined now that `dedupe_scans.py` exists.
5. Optional polish (from plan notes): volume labels, full-file browsing w/ server pagination, empty-dir awareness in treemap, old-file date formatting consistency.

---
*Reference doc generated from Antigravity trajectory `9754449a` + code inventory — 2026-09-24.*