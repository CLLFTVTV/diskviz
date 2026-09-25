from fastapi import APIRouter
import os
import shutil
import string
from ..models import DriveInfo

router = APIRouter(tags=["Drives"])

@router.get("/drives", response_model=list[DriveInfo])
def get_drives():
    drives = []
    if os.name == 'nt':
        for letter in string.ascii_uppercase:
            drive = f"{letter}:\\"
            if os.path.exists(drive):
                try:
                    usage = shutil.disk_usage(drive)
                    # For a real implementation, you might use win32api to get volume label
                    drives.append(DriveInfo(
                        letter=drive,
                        label="Local Disk",
                        total_bytes=usage.total,
                        used_bytes=usage.used,
                        free_bytes=usage.free
                    ))
                except OSError:
                    continue
    else:
        usage = shutil.disk_usage("/")
        drives.append(DriveInfo(
            letter="/",
            label="Root",
            total_bytes=usage.total,
            used_bytes=usage.used,
            free_bytes=usage.free
        ))
    return drives

@router.get("/browse")
def browse_path(path: str):
    result = []
    if not os.path.exists(path):
        return result
        
    try:
        with os.scandir(path) as it:
            for entry in it:
                if entry.is_dir(follow_symlinks=False):
                    try:
                        # Check if it has children
                        has_children = False
                        try:
                            with os.scandir(entry.path) as sub_it:
                                for sub_entry in sub_it:
                                    if sub_entry.is_dir(follow_symlinks=False):
                                        has_children = True
                                        break
                        except PermissionError:
                            pass
                            
                        result.append({
                            "name": entry.name,
                            "path": entry.path,
                            "has_children": has_children
                        })
                    except OSError:
                        continue
    except PermissionError:
        pass
        
    return result
