import sqlite3
import threading
from .config import DB_PATH

_local = threading.local()

def get_db():
    if not hasattr(_local, "db"):
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode = WAL")
        conn.execute("PRAGMA synchronous = NORMAL")
        conn.execute("PRAGMA temp_store = MEMORY")
        conn.execute("PRAGMA cache_size = -64000")
        _local.db = conn
    return _local.db

def init_db():
    conn = get_db()
    with conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id TEXT PRIMARY KEY,
                root_path TEXT,
                status TEXT DEFAULT 'pending',
                total_files INT DEFAULT 0,
                total_size INT DEFAULT 0,
                started_at TEXT,
                completed_at TEXT
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS files (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scan_id TEXT,
                path TEXT,
                name TEXT,
                extension TEXT,
                size INT,
                mtime REAL,
                parent_dir TEXT,
                depth INT,
                partial_hash TEXT,
                full_hash TEXT,
                FOREIGN KEY (scan_id) REFERENCES scans(id) ON DELETE CASCADE
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_files_scan_id ON files(scan_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_files_scan_size ON files(scan_id, size)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_files_scan_ext ON files(scan_id, extension)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_files_scan_parent ON files(scan_id, parent_dir)")
        # Pre-built treemap trees for completed scans (whole-scan + drilled paths).
        conn.execute("""
            CREATE TABLE IF NOT EXISTS treemap_cache (
                scan_id TEXT NOT NULL,
                path TEXT NOT NULL DEFAULT '',
                depth INTEGER NOT NULL DEFAULT 3,
                tree TEXT NOT NULL,
                built_at TEXT NOT NULL,
                PRIMARY KEY (scan_id, path, depth)
            )
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_treemap_cache_built ON treemap_cache(built_at)")

def close_db():
    if hasattr(_local, "db"):
        _local.db.close()
        del _local.db
