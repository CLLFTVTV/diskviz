import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { api, type FileRecord } from '~/lib/api';
import { FileTable } from '~/components/file-table';

export default function ResultsFiles() {
  const { id } = useParams<{ id: string }>();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    // We load a large chunk of files for the client side virtualized table
    // In a real production app with millions of files, we'd do server-side pagination,
    // but the backend api `getLargeFiles` with a high limit gives us the largest files.
    api.getLargeFiles(id, 10000)
      .then(setFiles)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight">File Browser</h2>
          <p className="text-muted-foreground text-sm">Showing top largest files in the scanned directory.</p>
        </div>
      </div>
      
      <FileTable data={files} loading={loading} />
    </div>
  );
}
