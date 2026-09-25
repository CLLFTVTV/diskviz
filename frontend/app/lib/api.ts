const BASE_URL = '/api';

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${url}`, init);
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export interface DriveInfo {
  letter: string;
  label: string;
  total_bytes: number;
  used_bytes: number;
  free_bytes: number;
}

export interface ScanInfo {
  id: string;
  root_path: string;
  status: string;
  total_files: number;
  total_size: number;
  started_at: string | null;
  completed_at: string | null;
}

export interface TreemapNode {
  name: string;
  path: string;
  size: number;
  is_file?: boolean;
  extension?: string | null;
  children?: TreemapNode[];
}

export interface ExtensionStat {
  extension: string;
  count: number;
  total_size: number;
}

export interface FileRecord {
  path: string;
  name: string;
  extension: string;
  size: number;
  mtime: number;
  parent_dir: string;
}

export interface DuplicateGroup {
  hash: string;
  size: number;
  count: number;
  wasted_space: number;
  files: string[];
}

export interface ScanStats {
  total_files: number;
  total_size: number;
  unique_extensions: number;
  avg_file_size: number;
  oldest_file_date: string | null;
  newest_file_date: string | null;
}

export const api = {
  getDrives: () => fetchJSON<DriveInfo[]>('/drives'),
  browsePath: (path: string) => fetchJSON<{name: string; path: string; has_children: boolean}[]>(`/browse?path=${encodeURIComponent(path)}`),
  getScans: () => fetchJSON<ScanInfo[]>('/scans'),
  getScan: (id: string) => fetchJSON<ScanInfo>(`/scans/${id}`),
  deleteScan: (id: string) => fetchJSON<void>(`/scans/${id}`, { method: 'DELETE' }),
  getScanStats: (id: string) => fetchJSON<ScanStats>(`/scans/${id}/stats`),
  getTreemap: (id: string, depth = 3, path?: string, signal?: AbortSignal) =>
    fetchJSON<TreemapNode>(`/scans/${id}/treemap?depth=${depth}${path ? `&path=${encodeURIComponent(path)}` : ''}`, { signal }),
  getExtensions: (id: string, limit = 20) => fetchJSON<ExtensionStat[]>(`/scans/${id}/extensions?limit=${limit}`),
  getLargeFiles: (id: string, limit = 100) => fetchJSON<FileRecord[]>(`/scans/${id}/large-files?limit=${limit}`),
  getOldFiles: (id: string, days = 365) => fetchJSON<FileRecord[]>(`/scans/${id}/old-files?days=${days}`),
  startDuplicateDetection: (id: string) => fetchJSON<{status: string}>(`/scans/${id}/duplicates/start`, { method: 'POST' }),
  getDuplicates: (id: string) => fetchJSON<DuplicateGroup[]>(`/scans/${id}/duplicates`),
  getDuplicateStatus: (id: string) => fetchJSON<{status: string}>(`/scans/${id}/duplicates/status`),
  getExportUrl: (id: string, format: 'csv' | 'json') => `${BASE_URL}/scans/${id}/export/${format}`,
};
