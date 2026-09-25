import { Fragment, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { api, type ScanStats, type TreemapNode, type ExtensionStat } from '~/lib/api';
import { formatBytes, formatNumber } from '~/lib/format';
import { StatCard } from '~/components/stat-card';
import { TreemapChart } from '~/components/treemap-chart';
import { ExtensionPie } from '~/components/extension-pie';
import { SizeBarChart } from '~/components/size-bar-chart';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Files, HardDrive, PieChart, Database, FolderUp } from 'lucide-react';

export default function ResultsOverview() {
  const { id } = useParams<{ id: string }>();
  const [stats, setStats] = useState<ScanStats | null>(null);
  const [treemap, setTreemap] = useState<TreemapNode | null>(null);
  const [extensions, setExtensions] = useState<ExtensionStat[]>([]);
  // Drilled folder root for the treemap; null = whole scan.
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [treemapLoading, setTreemapLoading] = useState(false);

  // Scan-level data (stats, extensions): fetch once per scan.
  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    Promise.all([
      api.getScanStats(id).catch(() => null),
      api.getExtensions(id, 15).catch(() => [])
    ]).then(([s, e]) => {
      if (cancelled) return;
      if (s) setStats(s);
      if (e) setExtensions(e);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Drill-level treemap: refetch only when the drilled root changes.
  useEffect(() => {
    if (!id) return;

    const controller = new AbortController();
    let cancelled = false;
    setTreemapLoading(true);
    api.getTreemap(id, 3, rootPath ?? undefined, controller.signal)
      .then((t) => {
        if (!cancelled && t) setTreemap(t);
      })
      .catch(() => {}) // aborted (fast drill clicks) or failed: keep the previous tree
      .finally(() => {
        if (!cancelled) setTreemapLoading(false);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [id, rootPath]);

  if (!stats) return <div className="p-8 text-center">Loading overview...</div>;

  const segments = rootPath ? rootPath.split('/') : [];
  const goTo = (path: string | null) => setRootPath(path);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Size" 
          value={formatBytes(stats.total_size)} 
          icon={<HardDrive className="h-4 w-4" />} 
        />
        <StatCard 
          title="Total Files" 
          value={formatNumber(stats.total_files)} 
          icon={<Files className="h-4 w-4" />} 
        />
        <StatCard 
          title="Avg File Size" 
          value={formatBytes(stats.avg_file_size)} 
          icon={<Database className="h-4 w-4" />} 
        />
        <StatCard 
          title="Extensions" 
          value={formatNumber(stats.unique_extensions)} 
          icon={<PieChart className="h-4 w-4" />} 
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>Directory Structure</CardTitle>
          {rootPath && (
            <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap text-xs" role="navigation" aria-label="Folder breadcrumb">
              <button
                type="button"
                onClick={() => goTo(null)}
                className="flex items-center gap-1 rounded px-1 py-0.5 text-zinc-400 hover:text-zinc-100"
                title="Back to scan root"
              >
                <FolderUp className="h-3 w-3" />
                Scan root
              </button>
              {segments.map((segment, i, arr) => (
                <Fragment key={`${segment}-${i}`}>
                  <span className="text-zinc-600">/</span>
                  <button
                    type="button"
                    onClick={() => goTo(arr.slice(0, i + 1).join('/'))}
                    className={
                      i === arr.length - 1
                        ? 'rounded px-1 py-0.5 font-semibold text-zinc-100'
                        : 'rounded px-1 py-0.5 text-zinc-400 hover:text-zinc-100'
                    }
                  >
                    {segment}
                  </button>
                </Fragment>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className={treemapLoading ? 'pointer-events-none opacity-60 transition-opacity' : 'transition-opacity'}>
              <TreemapChart data={treemap} onDrillDown={goTo} height="450px" />
            </div>
            {treemapLoading && (
              <div className="absolute right-3 top-3 rounded bg-zinc-900/80 px-2 py-1 text-xs text-zinc-400">
                Loading…
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Disk Usage by Extension</CardTitle>
          </CardHeader>
          <CardContent>
            <ExtensionPie data={extensions} height="350px" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Largest Directories (Top Level)</CardTitle>
          </CardHeader>
          <CardContent>
            {treemap && treemap.children ? (
              <SizeBarChart 
                data={treemap.children.map(c => ({ name: c.name, path: c.path, size: c.size }))} 
                height="350px" 
              />
            ) : (
              <div className="h-[350px] flex items-center justify-center text-muted-foreground">No data</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
