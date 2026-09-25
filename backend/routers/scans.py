from fastapi import APIRouter, HTTPException
from ..database import get_db
from ..models import ScanResponse

router = APIRouter(tags=["Scans"])

@router.get("/scans", response_model=list[ScanResponse])
def get_scans():
    db = get_db()
    cursor = db.execute("SELECT id, root_path, status, total_files, total_size, started_at, completed_at FROM scans ORDER BY started_at DESC")
    return [ScanResponse(**dict(row)) for row in cursor.fetchall()]

@router.get("/scans/{scan_id}", response_model=ScanResponse)
def get_scan(scan_id: str):
    db = get_db()
    cursor = db.execute("SELECT id, root_path, status, total_files, total_size, started_at, completed_at FROM scans WHERE id = ?", (scan_id,))
    row = cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Scan not found")
    return ScanResponse(**dict(row))

@router.delete("/scans/{scan_id}")
def delete_scan(scan_id: str):
    db = get_db()
    db.execute("DELETE FROM scans WHERE id = ?", (scan_id,))
    db.commit()
    return {"status": "deleted"}
