from fastapi import APIRouter
import threading
from ..database import get_db
from ..models import DuplicateGroup
from ..scanner.hasher import find_duplicates
from ..config import DB_PATH

router = APIRouter(tags=["Duplicates"])

active_duplicate_tasks = {}

@router.post("/scans/{scan_id}/duplicates/start")
def start_duplicates_scan(scan_id: str):
    if scan_id in active_duplicate_tasks:
        return {"status": "started"}
        
    def worker():
        try:
            find_duplicates(scan_id, DB_PATH)
        finally:
            active_duplicate_tasks.pop(scan_id, None)
            
    thread = threading.Thread(target=worker, daemon=True)
    active_duplicate_tasks[scan_id] = thread
    thread.start()
    
    return {"status": "started"}

@router.get("/scans/{scan_id}/duplicates", response_model=list[DuplicateGroup])
def get_duplicates(scan_id: str):
    db = get_db()
    cursor = db.execute("""
        SELECT full_hash, size, COUNT(*) as count 
        FROM files 
        WHERE scan_id = ? AND full_hash != '' AND full_hash IS NOT NULL
        GROUP BY full_hash 
        HAVING count > 1
    """, (scan_id,))
    groups = []
    for row in cursor:
        fhash = row['full_hash']
        size = row['size']
        count = row['count']
        
        f_cursor = db.execute("SELECT path FROM files WHERE scan_id = ? AND full_hash = ?", (scan_id, fhash))
        paths = [f['path'] for f in f_cursor.fetchall()]
        groups.append(DuplicateGroup(
            hash=fhash,
            size=size,
            count=count,
            wasted_space=size * (count - 1),
            files=paths
        ))
    return groups

@router.get("/scans/{scan_id}/duplicates/status")
def get_duplicates_status(scan_id: str):
    if scan_id in active_duplicate_tasks:
        return {"status": "running"}
    return {"status": "done"}
