import asyncio
import datetime
import json
import threading
import uuid
from fastapi import WebSocket, WebSocketDisconnect
from ..database import get_db
from ..scanner.filesystem import scan_directory
from ..config import SCAN_BATCH_SIZE, SCAN_FLUSH_INTERVAL

async def scan_websocket(websocket: WebSocket):
    await websocket.accept()
    
    cancel_event = threading.Event()
    scan_id = str(uuid.uuid4())
    db = get_db()
    
    try:
        data = await websocket.receive_json()
        root_path = data.get("path")
        if not root_path:
            await websocket.close(code=1003)
            return
            
        started_at = datetime.datetime.now(datetime.UTC).isoformat()
        db.execute("""
            INSERT INTO scans (id, root_path, status, started_at) 
            VALUES (?, ?, ?, ?)
        """, (scan_id, root_path, 'scanning', started_at))
        db.commit()
        
        await websocket.send_json({"type": "started", "scan_id": scan_id})
        
        queue = asyncio.Queue(maxsize=50)
        loop = asyncio.get_running_loop()
        
        def run_scan():
            batch = []
            for item in scan_directory(root_path, cancel_event):
                batch.append(item)
                if len(batch) >= SCAN_BATCH_SIZE:
                    try:
                        asyncio.run_coroutine_threadsafe(queue.put(list(batch)), loop).result()
                    except Exception:
                        break
                    batch.clear()
            if batch:
                try:
                    asyncio.run_coroutine_threadsafe(queue.put(list(batch)), loop).result()
                except Exception:
                    pass
            asyncio.run_coroutine_threadsafe(queue.put(None), loop)
            
        thread = threading.Thread(target=run_scan, daemon=True)
        thread.start()
        
        total_scanned = 0
        total_size = 0
        db_batch = []
        
        def flush_db_batch():
            if not db_batch:
                return
            db.executemany("""
                INSERT INTO files (scan_id, path, name, extension, size, mtime, parent_dir, depth, partial_hash, full_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '')
            """, [(scan_id, item['path'], item['name'], item['extension'], item['size'], item['mtime'], item['parent_dir'], item['depth']) for item in db_batch])
            db.commit()
            db_batch.clear()
        
        try:
            while True:
                try:
                    batch = await asyncio.wait_for(queue.get(), timeout=SCAN_FLUSH_INTERVAL)
                    if batch is None:
                        break
                        
                    batch_size = sum(item['size'] for item in batch)
                    total_scanned += len(batch)
                    total_size += batch_size
                    
                    db_batch.extend(batch)
                    if len(db_batch) >= 5000:
                        flush_db_batch()
                        
                    await websocket.send_json({
                        "type": "batch",
                        "items": batch,
                        "scanned": total_scanned,
                        "total_size": total_size
                    })
                except asyncio.TimeoutError:
                    continue
                    
        finally:
            flush_db_batch()
            
            if cancel_event.is_set():
                db.execute("UPDATE scans SET status = 'cancelled' WHERE id = ?", (scan_id,))
            else:
                completed_at = datetime.datetime.now(datetime.UTC).isoformat()
                db.execute("""
                    UPDATE scans 
                    SET status = 'done', total_files = ?, total_size = ?, completed_at = ?
                    WHERE id = ?
                """, (total_scanned, total_size, completed_at, scan_id))
            db.commit()

            if not cancel_event.is_set():
                # Pre-warm the whole-scan treemap cache so the results page is instant.
                try:
                    from ..routers.analysis import build_treemap
                    tree = build_treemap(db, scan_id, 3, "")
                    db.execute(
                        "INSERT OR REPLACE INTO treemap_cache (scan_id, path, depth, tree, built_at) VALUES (?, '', 3, ?, ?)",
                        (scan_id, json.dumps(tree), datetime.datetime.now(datetime.UTC).isoformat()),
                    )
                    db.commit()
                except Exception:
                    import logging
                    logging.getLogger("uvicorn.error").exception("Could not pre-warm treemap cache")

                await websocket.send_json({
                    "type": "done",
                    "scan_id": scan_id,
                    "total_files": total_scanned,
                    "total_size": total_size
                })
                
    except WebSocketDisconnect:
        cancel_event.set()
