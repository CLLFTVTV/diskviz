import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { api, type FileRecord } from '~/lib/api';
import { SizeBarChart } from '~/components/size-bar-chart';
import { FileTable } from '~/components/file-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';

export default function ResultsLargeFiles() {
  const { id } = useParams<{ id: string }>();
  const [largeFiles, setLargeFiles] = useState<FileRecord[]>([]);
  const [oldFiles, setOldFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    
    Promise.all([
      api.getLargeFiles(id, 50).catch(() => []),
      api.getOldFiles(id, 365).catch(() => [])
    ]).then(([l, o]) => {
      setLargeFiles(l);
      setOldFiles(o);
      setLoading(false);
    });
  }, [id]);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading file data...</div>;

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Largest Files</h2>
          <p className="text-muted-foreground">The top 50 largest files in the scanned directory.</p>
        </div>
        
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>Top 20 Size Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <SizeBarChart 
                data={largeFiles.slice(0, 20).map(f => ({ name: f.name, path: f.path, size: f.size }))} 
                height="500px" 
              />
            </CardContent>
          </Card>
          
          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>Files List</CardTitle>
            </CardHeader>
            <CardContent>
              <FileTable data={largeFiles} />
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="space-y-4 pt-8 border-t">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Old Files</h2>
          <p className="text-muted-foreground">Files that haven't been modified in over a year.</p>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <FileTable data={oldFiles} />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
