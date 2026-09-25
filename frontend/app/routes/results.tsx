import { useEffect, useState } from 'react';
import { Outlet, useParams, useLocation, Link } from 'react-router';
import { api, type ScanInfo } from '~/lib/api';
import { formatBytes, formatDuration, formatNumber } from '~/lib/format';
import { Tabs, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Card, CardContent } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '~/components/ui/dropdown-menu';
import { Download, HardDrive, Clock, FileStack, Settings } from 'lucide-react';

export default function ResultsLayout() {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const [scan, setScan] = useState<ScanInfo | null>(null);

  useEffect(() => {
    if (id) {
      api.getScan(id).then(setScan).catch(console.error);
    }
  }, [id]);

  if (!scan) return <div className="p-8 text-center text-muted-foreground">Loading scan info...</div>;

  const currentTab = location.pathname.split('/').pop() || id;
  const isRoot = currentTab === id;

  const durationStr = scan.started_at && scan.completed_at
    ? formatDuration(new Date(scan.completed_at).getTime() - new Date(scan.started_at).getTime())
    : '-';

  return (
    <div className="space-y-6">
      <Card className="bg-muted/30 border-none shadow-none">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight font-mono">{scan.root_path}</h1>
              <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center"><FileStack className="mr-1 h-4 w-4"/> {formatNumber(scan.total_files)} files</div>
                <div className="flex items-center"><HardDrive className="mr-1 h-4 w-4"/> {formatBytes(scan.total_size)}</div>
                <div className="flex items-center"><Clock className="mr-1 h-4 w-4"/> {durationStr}</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="mr-2 h-4 w-4" /> Export Data
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => window.open(api.getExportUrl(id!, 'csv'), '_blank')}>
                    Export as CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(api.getExportUrl(id!, 'json'), '_blank')}>
                    Export as JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={isRoot ? 'overview' : currentTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl mb-8">
          <TabsTrigger value="overview" asChild>
            <Link to={`/results/${id}`}>Overview</Link>
          </TabsTrigger>
          <TabsTrigger value="files" asChild>
            <Link to={`/results/${id}/files`}>Files</Link>
          </TabsTrigger>
          <TabsTrigger value="large-files" asChild>
            <Link to={`/results/${id}/large-files`}>Large & Old</Link>
          </TabsTrigger>
          <TabsTrigger value="duplicates" asChild>
            <Link to={`/results/${id}/duplicates`}>Duplicates</Link>
          </TabsTrigger>
        </TabsList>

        <div className="mt-6 animate-in fade-in duration-300">
          <Outlet />
        </div>
      </Tabs>
    </div>
  );
}
