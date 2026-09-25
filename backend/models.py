from pydantic import BaseModel
from typing import List, Optional
from enum import Enum

class DriveInfo(BaseModel):
    letter: str
    label: str
    total_bytes: int
    used_bytes: int
    free_bytes: int

class ScanCreate(BaseModel):
    path: str

class ScanResponse(BaseModel):
    id: str
    root_path: str
    status: str
    total_files: int
    total_size: int
    started_at: Optional[str]
    completed_at: Optional[str]

class FileEntry(BaseModel):
    path: str
    name: str
    extension: str
    size: int
    mtime: float
    parent_dir: str
    depth: int

class TreemapNode(BaseModel):
    name: str
    path: str
    size: int
    is_file: bool = False
    extension: Optional[str] = None
    children: Optional[List['TreemapNode']] = None

class ExtensionStat(BaseModel):
    extension: str
    count: int
    total_size: int

class DuplicateGroup(BaseModel):
    hash: str
    size: int
    count: int
    wasted_space: int
    files: List[str]

class ExportFormat(str, Enum):
    csv = "csv"
    json = "json"
