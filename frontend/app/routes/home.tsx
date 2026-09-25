import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { DrivePicker } from '~/components/drive-picker';
import { api, type ScanInfo } from '~/lib/api';
import { formatBytes, formatDate, formatNumber } from '~/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table';
import { History, ArrowRight } from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const [scans, setScans] = useState<ScanInfo[]>([]);

  useEffect(() => {
    api.getScans().then(setScans).catch(console.error);
  }, []);

  const handleSelectPath = (path: string) => {
    navigate(`/scan?path=${encodeURIComponent(path)}`);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <section className="text-center space-y-4 py-8">
        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Analyze Your Storage</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Find what's taking up space on your drives. Select a drive or folder below to begin scanning.
        </p>
      </section>

      <section>
        <DrivePicker onSelect={handleSelectPath} />
      </section>

      {scans.length > 0 && (
        <section className="mt-12 space-y-4">
          <div className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <h2 className="text-2xl font-semibold tracking-tight">Recent Scans</h2>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Files</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scans.map(scan => (
                    <TableRow key={scan.id}>
                      <TableCell className="font-medium">{scan.root_path}</TableCell>
                      <TableCell>
                        <Badge variant={scan.status === 'done' ? 'default' : 'secondary'}>
                          {scan.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatNumber(scan.total_files)}</TableCell>
                      <TableCell>{formatBytes(scan.total_size)}</TableCell>
                      <TableCell>{scan.completed_at ? formatDate(scan.completed_at) : '-'}</TableCell>
                      <TableCell className="text-right">
                        {scan.status === 'done' && (
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/results/${scan.id}`)}>
                            View Results <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
