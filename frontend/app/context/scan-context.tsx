import { createContext, useContext, useReducer, useRef, useCallback, type ReactNode } from 'react';
import type { FileRecord } from '~/lib/api';

interface ScanState {
  status: 'idle' | 'connecting' | 'scanning' | 'done' | 'error' | 'cancelled';
  scanId: string | null;
  scannedFiles: number;
  totalSize: number;
  recentFiles: FileRecord[];
  error: string | null;
  startTime: number | null;
}

type ScanAction =
  | { type: 'START' }
  | { type: 'CONNECTED'; scanId: string }
  | { type: 'BATCH'; items: FileRecord[]; scanned: number; totalSize: number }
  | { type: 'DONE'; scanId: string; totalFiles: number; totalSize: number }
  | { type: 'ERROR'; error: string }
  | { type: 'CANCEL' }
  | { type: 'RESET' };

const initialState: ScanState = {
  status: 'idle',
  scanId: null,
  scannedFiles: 0,
  totalSize: 0,
  recentFiles: [],
  error: null,
  startTime: null,
};

function scanReducer(state: ScanState, action: ScanAction): ScanState {
  switch (action.type) {
    case 'START':
      // Ignore START while a scan is already in flight (React dev StrictMode
      // double-fires effects, and double-clicks both reach here).
      if (state.status === 'connecting' || state.status === 'scanning') return state;
      return { ...initialState, status: 'connecting', startTime: Date.now() };
    case 'CONNECTED':
      return { ...state, status: 'scanning', scanId: action.scanId };
    case 'BATCH':
      return {
        ...state,
        scannedFiles: action.scanned,
        totalSize: action.totalSize,
        recentFiles: [...action.items.slice(-20), ...state.recentFiles].slice(0, 50),
      };
    case 'DONE':
      return { ...state, status: 'done', scanId: action.scanId, scannedFiles: action.totalFiles, totalSize: action.totalSize };
    case 'ERROR':
      return { ...state, status: 'error', error: action.error };
    case 'CANCEL':
      return { ...state, status: 'cancelled' };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface ScanContextType {
  state: ScanState;
  startScan: (path: string) => void;
  cancelScan: () => void;
  reset: () => void;
}

const ScanContext = createContext<ScanContextType | null>(null);

export function ScanProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(scanReducer, initialState);
  const wsRef = useRef<WebSocket | null>(null);

  const startScan = useCallback((path: string) => {
    // Never open a second WebSocket if one is already connecting/scanning —
    // guards against dev StrictMode double-effects and duplicate clicks.
    const existing = wsRef.current;
    if (existing && (existing.readyState === WebSocket.CONNECTING || existing.readyState === WebSocket.OPEN)) {
      return;
    }

    dispatch({ type: 'START' });

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/scan`);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ path }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        switch (msg.type) {
          case 'started':
            dispatch({ type: 'CONNECTED', scanId: msg.scan_id });
            break;
          case 'batch':
            dispatch({ type: 'BATCH', items: msg.items, scanned: msg.scanned, totalSize: msg.total_size });
            break;
          case 'done':
            dispatch({ type: 'DONE', scanId: msg.scan_id, totalFiles: msg.total_files, totalSize: msg.total_size });
            ws.close();
            break;
          case 'error':
            dispatch({ type: 'ERROR', error: msg.message });
            ws.close();
            break;
        }
      } catch (e) {
        console.error('WS parse error:', e);
      }
    };

    ws.onerror = () => {
      dispatch({ type: 'ERROR', error: 'WebSocket connection failed' });
    };

    ws.onclose = () => {
      wsRef.current = null;
    };
  }, []);

  const cancelScan = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    dispatch({ type: 'CANCEL' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  return (
    <ScanContext.Provider value={{ state, startScan, cancelScan, reset }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used within ScanProvider');
  return ctx;
}
