import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { api, type DuplicateGroup } from '~/lib/api';
import { formatBytes, formatNumber } from '~/lib/format';
import { Button } from '~/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Progress } from '~/components/ui/progress';
import { ScrollArea } from '~/components/ui/scroll-area';
import { Copy, AlertCircle, Trash2 } from 'lucide-react';

export default function ResultsDuplicates() {
  const { id } = useParams<{ id: string }>();
  const [status, setStatus] = useState<string>('idle');
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    checkStatus();
  }, [id]);

  const checkStatus = () => {
    if (!id) return;
    api.getDuplicateStatus(id).then(res => {
      setStatus(res.status);
      if (res.status === 'completed') {
        loadDuplicates();
      } else if (res.status === 'running') {
        setTimeout(checkStatus, 2000);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const loadDuplicates = () => {
    if (!id) return;
    api.getDuplicates(id).then(setGroups).catch(console.error);
  };

  const startDetection = () => {
    if (!id) return;
    setStatus('running');
    api.startDuplicateDetection(id).then(() => {
      checkStatus();
    }).catch(console.error);
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;

  if (status === 'idle' || status === 'not_started') {
    return (
      <Card className="max-w-2xl mx-auto text-center py-12">
        <CardHeader>
          <div className="mx-auto bg-muted p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4">
            <Copy className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Find Duplicate Files</CardTitle>
          <CardDescription className="text-base mt-2">
            Scan your files to find exact duplicates based on content hash. This process can take a while depending on the number of files and your disk speed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button size="lg" onClick={startDetection}>Start Duplicate Detection</Button>
        </CardContent>
      </Card>
    );
  }

  if (status === 'running') {
    return (
      <Card className="max-w-md mx-auto text-center py-12">
        <CardContent className="space-y-6">
          <div className="mx-auto bg-primary/10 p-4 rounded-full w-16 h-16 flex items-center justify-center animate-pulse">
            <Copy className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Analyzing files...</h3>
            <p className="text-sm text-muted-foreground mb-4">Computing file hashes to find exact matches.</p>
            <Progress value={undefined} className="h-2 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalWasted = groups.reduce((acc, g) => acc + g.wasted_space, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-destructive/10 text-destructive border border-destructive/20 p-4 rounded-lg">
        <div className="flex items-center space-x-4">
          <AlertCircle className="h-6 w-6" />
          <div>
            <div className="font-semibold">{formatNumber(groups.length)} Duplicate Groups Found</div>
            <div className="text-sm">Total wasted space: {formatBytes(totalWasted)}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {groups.map((group, idx) => (
          <Card key={idx} className="overflow-hidden">
            <CardHeader className="bg-muted/30 py-3 px-4 border-b">
              <div className="flex justify-between items-center">
                <div className="flex space-x-4 text-sm">
                  <span className="font-semibold text-primary">{formatBytes(group.size)} each</span>
                  <span className="text-muted-foreground">{group.count} files</span>
                  <span className="text-destructive font-medium">{formatBytes(group.wasted_space)} wasted</span>
                </div>
                <span className="font-mono text-xs text-muted-foreground truncate w-32" title={group.hash}>{group.hash.substring(0, 8)}...</span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[200px] w-full">
                <div className="divide-y">
                  {group.files.map((file, i) => (
                    <div key={i} className="flex items-center justify-between p-3 text-sm hover:bg-muted/50 transition-colors">
                      <span className="font-mono text-xs truncate flex-1" title={file}>{file}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
