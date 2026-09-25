import { useEffect, useState } from 'react';
import { Card, CardContent } from './ui/card';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { formatBytes, formatDuration, formatNumber } from '~/lib/format';
import { useScan } from '~/context/scan-context';
import { Loader2, XCircle } from 'lucide-react';

export function ScanProgress() {
  const { state, cancelScan } = useScan();
  const { scannedFiles, totalSize, startTime, status, error } = state;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status === 'scanning' && startTime) {
      const interval = setInterval(() => {
        setElapsed(Date.now() - startTime);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [status, startTime]);

  if (status === 'idle') return null;

  const speed = elapsed > 0 ? (scannedFiles / (elapsed / 1000)) : 0;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg border-primary/20">
      <CardContent className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">
            {status === 'connecting' && 'Connecting...'}
            {status === 'scanning' && 'Scanning Drive...'}
            {status === 'done' && 'Scan Complete'}
            {status === 'error' && 'Scan Failed'}
            {status === 'cancelled' && 'Scan Cancelled'}
          </h2>
          <Badge variant={status === 'scanning' ? 'default' : 'secondary'} className="animate-in fade-in">
            {status.toUpperCase()}
          </Badge>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Files Scanned</span>
            <span className="font-mono font-medium">{formatNumber(scannedFiles)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Size</span>
            <span className="font-mono font-medium">{formatBytes(totalSize)}</span>
          </div>
          <Progress 
            value={status === 'done' ? 100 : (status === 'scanning' ? undefined : 0)} 
            className="h-3 my-4" 
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm bg-muted/50 p-4 rounded-lg">
          <div>
            <div className="text-muted-foreground mb-1">Elapsed Time</div>
            <div className="font-mono text-lg">{formatDuration(elapsed)}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Scan Speed</div>
            <div className="font-mono text-lg">{formatNumber(Math.round(speed))} files/s</div>
          </div>
        </div>

        {error && (
          <div className="text-destructive text-sm p-3 bg-destructive/10 rounded-md flex items-start">
            <XCircle className="h-4 w-4 mr-2 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {status === 'scanning' && (
          <div className="flex justify-end pt-4">
            <Button variant="destructive" onClick={cancelScan}>
              <XCircle className="mr-2 h-4 w-4" /> Cancel Scan
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
