import os
import xxhash
from ..database import get_db
from ..models import DuplicateGroup
from ..config import HASH_CHUNK_SIZE

def compute_hash(path: str, chunk_size: int = -1) -> str:
    h = xxhash.xxh3_64()
    try:
        with open(path, 'rb') as f:
            if chunk_size > 0:
                chunk = f.read(chunk_size)
                h.update(chunk)
            else:
                while chunk := f.read(HASH_CHUNK_SIZE):
                    h.update(chunk)
    except (PermissionError, FileNotFoundError, OSError):
        return ""
    return h.hexdigest()

def find_duplicates(scan_id: str, db_path: str, progress_callback=None, cancel_event=None):
    db = get_db()
    
    cursor = db.execute("SELECT root_path FROM scans WHERE id = ?", (scan_id,))
    scan_row = cursor.fetchone()
    if not scan_row:
        return []
    root_path = scan_row['root_path']
    
    # Stage 1: Group by size
    cursor = db.execute("""
        SELECT size, COUNT(*) as count 
        FROM files 
        WHERE scan_id = ? AND size > 0 
        GROUP BY size 
        HAVING count > 1
    """, (scan_id,))
    size_groups = cursor.fetchall()
    
    if progress_callback:
        progress_callback('stage1', len(size_groups), len(size_groups))
        
    candidates_count = sum(row['count'] for row in size_groups)
    processed = 0
    
    # Stage 2: Partial hash
    for row in size_groups:
        size = row['size']
        if cancel_event and cancel_event.is_set():
            return []
            
        files_cursor = db.execute("SELECT id, path FROM files WHERE scan_id = ? AND size = ?", (scan_id, size))
        files = files_cursor.fetchall()
        
        for file_row in files:
            full_path = os.path.join(root_path, file_row['path'])
            partial_hash = compute_hash(full_path, HASH_CHUNK_SIZE)
            db.execute("UPDATE files SET partial_hash = ? WHERE id = ?", (partial_hash, file_row['id']))
            processed += 1
            if progress_callback and processed % 100 == 0:
                progress_callback('stage2', processed, candidates_count)
    
    db.commit()
    
    # Stage 3: Full hash
    cursor = db.execute("""
        SELECT partial_hash, COUNT(*) as count 
        FROM files 
        WHERE scan_id = ? AND partial_hash != '' 
        GROUP BY partial_hash 
        HAVING count > 1
    """, (scan_id,))
    partial_groups = cursor.fetchall()
    
    candidates_count = sum(row['count'] for row in partial_groups)
    processed = 0
    
    for row in partial_groups:
        phash = row['partial_hash']
        if cancel_event and cancel_event.is_set():
            return []
            
        files_cursor = db.execute("SELECT id, path FROM files WHERE scan_id = ? AND partial_hash = ?", (scan_id, phash))
        files = files_cursor.fetchall()
        
        for file_row in files:
            full_path = os.path.join(root_path, file_row['path'])
            full_hash = compute_hash(full_path, -1)
            db.execute("UPDATE files SET full_hash = ? WHERE id = ?", (full_hash, file_row['id']))
            processed += 1
            if progress_callback and processed % 100 == 0:
                progress_callback('stage3', processed, candidates_count)
                
    db.commit()
    
    # Get final groups
    cursor = db.execute("""
        SELECT full_hash, size, COUNT(*) as count 
        FROM files 
        WHERE scan_id = ? AND full_hash != '' 
        GROUP BY full_hash 
        HAVING count > 1
    """, (scan_id,))
    final_groups = cursor.fetchall()
    
    results = []
    for row in final_groups:
        fhash = row['full_hash']
        size = row['size']
        count = row['count']
        
        files_cursor = db.execute("SELECT path FROM files WHERE scan_id = ? AND full_hash = ?", (scan_id, fhash))
        file_paths = [f['path'] for f in files_cursor.fetchall()]
        
        results.append(DuplicateGroup(
            hash=fhash,
            size=size,
            count=count,
            wasted_space=size * (count - 1),
            files=file_paths
        ))
        
    return results
