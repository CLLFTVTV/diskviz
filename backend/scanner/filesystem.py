import os
import sys

def normalize_windows_path(path: str) -> str:
    abs_path = os.path.abspath(path)
    prefix = "\\\\?\\"
    if sys.platform == 'win32' and not abs_path.startswith(prefix):
        return prefix + abs_path
    return abs_path

def scan_directory(root_dir: str, cancel_event=None):
    root_dir = normalize_windows_path(root_dir)
    stack = [(root_dir, 0)]
    
    while stack:
        if cancel_event and cancel_event.is_set():
            break
            
        current_dir, depth = stack.pop()
        
        try:
            with os.scandir(current_dir) as it:
                for entry in it:
                    if cancel_event and cancel_event.is_set():
                        break
                    
                    try:
                        if entry.is_symlink():
                            continue
                            
                        if entry.is_dir(follow_symlinks=False):
                            stack.append((entry.path, depth + 1))
                        elif entry.is_file(follow_symlinks=False):
                            stat = entry.stat(follow_symlinks=False)
                            _, ext = os.path.splitext(entry.name)
                            
                            parent_dir = os.path.relpath(current_dir, root_dir)
                            if parent_dir == '.':
                                parent_dir = ''
                                
                            rel_path = os.path.relpath(entry.path, root_dir)
                            
                            yield {
                                'path': rel_path,
                                'name': entry.name,
                                'extension': ext.lower(),
                                'size': stat.st_size,
                                'mtime': stat.st_mtime,
                                'parent_dir': parent_dir,
                                'depth': depth
                            }
                    except (PermissionError, FileNotFoundError, OSError):
                        continue
        except (PermissionError, FileNotFoundError, OSError):
            continue
