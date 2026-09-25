from fastapi import APIRouter
from fastapi.responses import StreamingResponse
import csv
import orjson
import io
from ..database import get_db

router = APIRouter(tags=["Export"])

@router.get("/scans/{scan_id}/export/csv")
def export_csv(scan_id: str):
    def iter_csv():
        db = get_db()
        cursor = db.execute("SELECT path, name, extension, size, mtime, parent_dir, depth FROM files WHERE scan_id = ?", (scan_id,))
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["path", "name", "extension", "size", "mtime", "parent_dir", "depth"])
        yield output.getvalue()
        output.truncate(0)
        output.seek(0)
        
        while True:
            rows = cursor.fetchmany(1000)
            if not rows:
                break
            for row in rows:
                writer.writerow([row['path'], row['name'], row['extension'], row['size'], row['mtime'], row['parent_dir'], row['depth']])
            yield output.getvalue()
            output.truncate(0)
            output.seek(0)
            
    headers = {"Content-Disposition": f"attachment; filename=scan_{scan_id}.csv"}
    return StreamingResponse(iter_csv(), media_type="text/csv", headers=headers)

@router.get("/scans/{scan_id}/export/json")
def export_json(scan_id: str):
    def iter_json():
        db = get_db()
        cursor = db.execute("SELECT path, name, extension, size, mtime, parent_dir, depth FROM files WHERE scan_id = ?", (scan_id,))
        
        while True:
            rows = cursor.fetchmany(1000)
            if not rows:
                break
            for row in rows:
                yield orjson.dumps(dict(row)) + b"\n"
                
    headers = {"Content-Disposition": f"attachment; filename=scan_{scan_id}.json"}
    return StreamingResponse(iter_json(), media_type="application/x-ndjson", headers=headers)
