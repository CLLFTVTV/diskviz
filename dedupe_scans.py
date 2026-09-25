#!/usr/bin/env python
"""Delete duplicate scans from diskviz.db, keeping the newest scan per root_path.

Safe by default: prints the plan and exits unless --apply is passed.
File rows are deleted explicitly (SQLite FK cascades are not relied on).

Usage:
    uv run python dedupe_scans.py            # dry run — show what would be deleted
    uv run python dedupe_scans.py --apply    # actually delete
"""
import argparse
import sqlite3


DB_PATH = "diskviz.db"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="actually delete (default is a dry run)")
    parser.add_argument("--db", default=DB_PATH, help="path to the SQLite database")
    args = parser.parse_args()

    conn = sqlite3.connect(args.db)
    conn.row_factory = sqlite3.Row

    scans = conn.execute(
        "SELECT id, root_path, status, total_files, total_size, started_at FROM scans ORDER BY started_at DESC"
    ).fetchall()
    if not scans:
        print("No scans in the database.")
        return

    print(f"Found {len(scans)} scans:\n")
    for s in scans:
        print(
            f"  {s['id']}  {s['status']:<10} files={s['total_files'] or 0:>7}  "
            f"started={s['started_at']}  root={s['root_path']}"
        )

    # Keep the newest scan per root_path (scans are listed newest-first).
    keep_ids = set()
    seen_roots = set()
    for s in scans:
        root = s["root_path"] or "(null)"
        if root not in seen_roots:
            seen_roots.add(root)
            keep_ids.add(s["id"])

    delete_ids = [s["id"] for s in scans if s["id"] not in keep_ids]
    if not delete_ids:
        print("\nNo duplicates — nothing to delete.")
        return

    placeholders = ",".join("?" * len(delete_ids))

    n_files = conn.execute(
        f"SELECT COUNT(*) FROM files WHERE scan_id IN ({placeholders})", delete_ids
    ).fetchone()[0]

    has_cache = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name='treemap_cache'"
    ).fetchone() is not None
    n_cache = (
        conn.execute(
            f"SELECT COUNT(*) FROM treemap_cache WHERE scan_id IN ({placeholders})", delete_ids
        ).fetchone()[0]
        if has_cache
        else 0
    )

    print(f"\nKeeping {len(keep_ids)} scan(s) (newest per root_path).")
    print(
        f"Deleting {len(delete_ids)} duplicate scan(s): removes {n_files} file rows and {n_cache} treemap-cache rows."
    )

    if not args.apply:
        print("\nDry run — pass --apply to actually delete.")
        return

    with conn:
        conn.execute(f"DELETE FROM files WHERE scan_id IN ({placeholders})", delete_ids)
        if has_cache:
            conn.execute(f"DELETE FROM treemap_cache WHERE scan_id IN ({placeholders})", delete_ids)
        conn.execute(f"DELETE FROM scans WHERE id IN ({placeholders})", delete_ids)
    print(
        f"Done. Removed {len(delete_ids)} scan(s), {n_files} file rows, {n_cache} treemap-cache rows."
    )


if __name__ == "__main__":
    main()