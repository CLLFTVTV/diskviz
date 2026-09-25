import datetime
import json
from typing import Optional
from fastapi import APIRouter
from ..database import get_db

router = APIRouter(tags=["Analysis"])

@router.get("/scans/{scan_id}/stats")
def get_scan_stats(scan_id: str):
    db = get_db()
    cursor = db.execute("""
        SELECT 
            COUNT(id) as total_files,
            SUM(size) as total_size,
            COUNT(DISTINCT extension) as unique_extensions,
            AVG(size) as avg_file_size,
            MIN(mtime) as oldest_file_date,
            MAX(mtime) as newest_file_date
        FROM files WHERE scan_id = ?
    """, (scan_id,))
    row = cursor.fetchone()
    return dict(row) if row else {}

def build_treemap(db, scan_id: str, depth: int = 3, path: Optional[str] = None) -> dict:
    """Build the depth-limited prefix tree for a scan, optionally rooted at
    `path` (scan-root-relative, boundary-safe prefix match). Returns a plain
    dict tree so it can be cached as JSON."""

    # A 'path' drills the tree into a subfolder: it becomes the new root and
    # only files beneath it are included.
    root_path = (path or "").strip().replace('\\', '/').rstrip('/')
    root_parts = root_path.split('/') if root_path else []
    is_drilled = bool(root_parts)

    cursor = db.execute("SELECT path, size, extension FROM files WHERE scan_id = ?", (scan_id,))

    root_node = {
        "name": root_parts[-1] if is_drilled else "root",
        "path": root_path if is_drilled else "root",
        "size": 0,
        "children": {},
        "is_file": False,
        "extension": None,
    }

    for row in cursor:
        parts = row['path'].replace('\\', '/').split('/')
        if is_drilled:
            # Skip anything not inside the drilled folder.
            if len(parts) <= len(root_parts) or parts[:len(root_parts)] != root_parts:
                continue
            parts = parts[len(root_parts):]
        current = root_node
        current['size'] += row['size']

        # Traverse up to depth limit
        for i in range(min(depth, len(parts))):
            part = parts[i]
            node_path = '/'.join(([root_path] if is_drilled else []) + parts[:i+1])
            if part not in current['children']:
                current['children'][part] = {
                    "name": part,
                    "path": node_path,
                    "size": 0,
                    "children": {},
                    "is_file": False,
                    "extension": None,
                }
            current = current['children'][part]
            current['size'] += row['size']
            if i == len(parts) - 1:
                current['is_file'] = True
                current['extension'] = row['extension']

    def build_tree(node):
        children = [build_tree(child) for child in node['children'].values()] if node['children'] else None
        return {
            "name": node['name'],
            "path": node['path'],
            "size": node['size'],
            "is_file": node['is_file'],
            "extension": node['extension'],
            "children": children,
        }

    return build_tree(root_node)


def _trim_treemap_cache(db, cap: int = 300):
    """Keep the cache bounded: drop everything older than the `cap` newest rows."""
    db.execute(
        "DELETE FROM treemap_cache WHERE built_at NOT IN "
        "(SELECT built_at FROM treemap_cache ORDER BY built_at DESC LIMIT ?)",
        (cap,),
    )


@router.get("/scans/{scan_id}/treemap")
def get_treemap(scan_id: str, depth: int = 3, path: Optional[str] = None):
    db = get_db()
    cpath = (path or "").strip().replace('\\', '/').rstrip('/')

    # Completed scans are immutable: serve from the cache, building on first
    # access (the build is the expensive ~0.5s part; cached reads are ~ms).
    scan = db.execute("SELECT status FROM scans WHERE id = ?", (scan_id,)).fetchone()
    if scan and scan['status'] == 'done':
        cached = db.execute(
            "SELECT tree FROM treemap_cache WHERE scan_id = ? AND path = ? AND depth = ?",
            (scan_id, cpath, depth),
        ).fetchone()
        if cached is not None:
            return json.loads(cached['tree'])

        tree = build_treemap(db, scan_id, depth, cpath)
        db.execute(
            "INSERT OR REPLACE INTO treemap_cache (scan_id, path, depth, tree, built_at) VALUES (?, ?, ?, ?, ?)",
            (scan_id, cpath, depth, json.dumps(tree), datetime.datetime.now(datetime.UTC).isoformat()),
        )
        _trim_treemap_cache(db)
        db.commit()
        return tree

    # Not marked done yet (scanning / cancelled / unknown) — build fresh each time.
    return build_treemap(db, scan_id, depth, cpath)

@router.get("/scans/{scan_id}/extensions")
def get_extensions(scan_id: str, limit: int = 20):
    db = get_db()
    cursor = db.execute("""
        SELECT extension, COUNT(*) as count, SUM(size) as total_size
        FROM files WHERE scan_id = ?
        GROUP BY extension
        ORDER BY total_size DESC
        LIMIT ?
    """, (scan_id, limit))
    return [dict(row) for row in cursor.fetchall()]

@router.get("/scans/{scan_id}/large-files")
def get_large_files(scan_id: str, limit: int = 100):
    db = get_db()
    cursor = db.execute("""
        SELECT name, path, size, extension
        FROM files WHERE scan_id = ?
        ORDER BY size DESC
        LIMIT ?
    """, (scan_id, limit))
    return [dict(row) for row in cursor.fetchall()]

@router.get("/scans/{scan_id}/old-files")
def get_old_files(scan_id: str, days: int = 365):
    import time
    db = get_db()
    cutoff = time.time() - (days * 86400)
    cursor = db.execute("""
        SELECT name, path, size, mtime
        FROM files WHERE scan_id = ? AND mtime < ?
        ORDER BY mtime ASC
    """, (scan_id, cutoff))
    return [dict(row) for row in cursor.fetchall()]
