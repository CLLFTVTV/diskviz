import { useEffect, useMemo } from 'react';
import { useECharts } from '~/hooks/use-echarts';
import type { TreemapNode } from '~/lib/api';
import { formatBytes } from '~/lib/format';

interface TreemapChartProps {
  data: TreemapNode | null;
  onDrillDown?: (path: string) => void;
  height?: string;
}

/**
 * Layout values are transformed with size^LAYOUT_POWER so a handful of giant
 * files no longer swallow the whole chart. sqrt (0.5) is a good balance: the
 * biggest file stays the biggest, but small files get a visible share. Real
 * byte sizes are kept in `rawSize` and shown in labels/tooltips.
 */
const LAYOUT_POWER = 0.5;

/**
 * Stable color per file extension (hash -> hue). Files without an extension
 * get a neutral gray; directory tiles keep the neutral dark level styles so
 * files pop.
 */
function extensionColor(extension: string | null | undefined): string {
  if (!extension) return '#71717a';
  let hash = 0;
  for (let i = 0; i < extension.length; i++) {
    hash = (hash * 31 + extension.charCodeAt(i)) % 360;
  }
  return `hsl(${hash} 65% 55%)`;
}

interface LayoutNode {
  name: string;
  path: string;
  rawSize: number;
  value: number;
  isFile: boolean;
  extension: string | null;
  itemStyle?: { color: string };
  children?: LayoutNode[];
}

function transformData(node: TreemapNode): LayoutNode {
  const hasChildren = !!(node.children && node.children.length);
  const children = hasChildren ? node.children!.map(transformData) : undefined;
  const value = children
    ? children.reduce((sum, child) => sum + child.value, 0)
    : Math.pow(Math.max(node.size, 0), LAYOUT_POWER);

  const out: LayoutNode = {
    name: node.name,
    path: node.path,
    rawSize: node.size,
    value,
    isFile: !!node.is_file,
    extension: node.extension ?? null,
  };
  if (node.is_file) out.itemStyle = { color: extensionColor(node.extension) };
  if (children) out.children = children;
  return out;
}

function formatSize(value: number | undefined): string {
  return formatBytes(typeof value === 'number' && isFinite(value) ? value : 0);
}

export function TreemapChart({ data, onDrillDown, height = '500px' }: TreemapChartProps) {
  const layoutRoot = useMemo(() => (data ? transformData(data) : null), [data]);
  const { containerRef, chartRef } = useECharts(
    data && layoutRoot
      ? {
          tooltip: {
            formatter: (info: any) => {
              const node = info.data as LayoutNode | undefined;
              const rawSize = node?.rawSize ?? info.value;
              const treePathInfo = info.treePathInfo ?? [];
              const treePath: string[] = [];
              for (let i = 1; i < treePathInfo.length; i++) {
                treePath.push(treePathInfo[i].name);
              }
              const lines = [
                `<div class="font-bold">${info.name}</div>`,
                `Size: ${formatSize(rawSize)}`,
              ];
              if (node?.isFile) {
                lines.push(`Extension: ${node.extension || '(none)'}`);
              }
              if (treePath.length) {
                lines.push(`Path: ${treePath.join('/')}`);
              }
              return lines.join('<br>');
            },
          },
          series: [
            {
              type: 'treemap',
              data: [layoutRoot],
              roam: false,
              nodeClick: false,
              visibleMin: 3,
              animation: false, // no layout tween on drill swaps — instant updates
              breadcrumb: { show: false },
              itemStyle: {
                borderColor: '#18181b',
                borderWidth: 1,
                gapWidth: 1,
              },
              levels: [
                {
                  itemStyle: { color: '#27272a', borderColor: '#18181b', borderWidth: 2, gapWidth: 2 },
                },
                {
                  itemStyle: { color: '#3f3f46', borderColor: '#27272a', borderWidth: 1, gapWidth: 1 },
                },
                {
                  itemStyle: { color: '#52525b', borderColor: '#3f3f46', borderWidth: 0.5, gapWidth: 0.5 },
                },
              ],
              label: {
                show: true,
                formatter: (params: any) =>
                  `${params.name}\n${formatSize(params.data?.rawSize ?? params.value)}`,
                color: '#e4e4e7',
                fontSize: 12,
                lineHeight: 16
              },
              upperLabel: {
                show: true,
                height: 22,
                formatter: (params: any) => {
                  const node = params.data as LayoutNode | undefined;
                  // The whole-scan container is a synthetic 'root' node — no label.
                  if (node?.path === 'root') return '';
                  return `${params.name} — ${formatSize(node?.rawSize ?? params.value)}`;
                },
                color: '#e4e4e7',
                fontSize: 12,
              },
            },
          ],
        }
      : null,
    'dark'
  );

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !layoutRoot) return;
    const outerPath = layoutRoot.path;
    const handleClick = (params: any) => {
      const node = params?.data as LayoutNode | undefined;
      if (!node || node.isFile || !onDrillDown) return;
      // Ignore clicks on the current root tile itself (already at that folder).
      if (node.path && node.path !== outerPath) onDrillDown(node.path);
    };
    chart.on('click', handleClick);
    return () => {
      chart.off('click', handleClick);
    };
  }, [chartRef, layoutRoot, onDrillDown]);

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <span
        className="pointer-events-none absolute bottom-1 right-2 text-[11px] text-zinc-500"
        title="Tile area is proportional to the square root of the file size, so small files stay visible next to very large ones. Sizes shown are the real byte sizes."
      >
        area ∝ √size
      </span>
    </div>
  );
}