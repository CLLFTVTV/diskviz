import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useScan } from '~/context/scan-context';
import { ScanProgress } from '~/components/scan-progress';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { ScrollArea } from '~/components/ui/scroll-area';
import { FileIcon, ArrowRight } from 'lucide-react';

export default function Scan() {
  const [searchParams] = useSearchParams();
  const path = searchParams.get('path');
  const navigate = useNavigate();
  const { state, startScan, reset } = useScan();

  useEffect(() => {
    if (path && state.status === 'idle') {
      startScan(path);
    }
  }, [path, state.status, startScan]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (state.status === 'done' || state.status === 'error' || state.status === 'cancelled') {
        reset();
      }
    };
  }, [state.status, reset]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Scanning Directory</h1>
        <p className="text-muted-foreground font-mono text-sm">{path}</p>
      </div>

      <ScanProgress />

      {state.status === 'done' && state.scanId && (
        <div className="flex justify-center pt-8 animate-in zoom-in duration-500">
          <Button size="lg" onClick={() => navigate(`/results/${state.scanId}`)}>
            View Analysis Results <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      )}

      {state.recentFiles.length > 0 && (
        <Card className="mt-8 border-border/50 bg-card/50">
          <CardHeader>
            <CardTitle className="text-lg">Recently Scanned Files</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4 bg-background">
              <div className="space-y-2">
                {state.recentFiles.map((f, i) => (
                  <div key={i} className="flex items-center text-sm">
                    <FileIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span className="truncate flex-1 font-mono text-xs" title={f.path}>{f.path}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
