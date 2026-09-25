import { useECharts } from '~/hooks/use-echarts';
import { formatBytes } from '~/lib/format';

interface SizeBarChartProps {
  data: { name: string; size: number; path?: string }[];
  title?: string;
  height?: string;
}

export function SizeBarChart({ data, title, height = '400px' }: SizeBarChartProps) {
  const sorted = [...data].sort((a, b) => a.size - b.size); // Ascending for horizontal bar
  
  const { containerRef } = useECharts(
    data.length > 0
      ? {
          title: title ? { text: title, textStyle: { color: '#e4e4e7', fontSize: 16 } } : undefined,
          tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: (params: any) => {
              const d = params[0];
              const item = sorted[d.dataIndex];
              return `${item.path || item.name}<br/>Size: ${formatBytes(item.size)}`;
            },
          },
          grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
          xAxis: {
            type: 'value',
            axisLabel: {
              formatter: (val: number) => formatBytes(val, 0),
              color: '#a1a1aa'
            },
            splitLine: { lineStyle: { color: '#27272a' } }
          },
          yAxis: {
            type: 'category',
            data: sorted.map((d) => {
              // Truncate name
              const parts = (d.path || d.name).split('\\');
              const short = parts.slice(-2).join('\\');
              return short.length > 30 ? '...' + short.slice(-27) : short;
            }),
            axisLabel: { color: '#e4e4e7' }
          },
          series: [
            {
              type: 'bar',
              data: sorted.map((d) => d.size),
              itemStyle: {
                color: {
                  type: 'linear',
                  x: 0, y: 0, x2: 1, y2: 0,
                  colorStops: [
                    { offset: 0, color: '#3b82f6' },
                    { offset: 1, color: '#8b5cf6' }
                  ]
                },
                borderRadius: [0, 4, 4, 0]
              }
            }
          ]
        }
      : null,
    'dark'
  );

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
