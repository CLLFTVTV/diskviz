import { useECharts } from '~/hooks/use-echarts';
import type { ExtensionStat } from '~/lib/api';
import { formatBytes } from '~/lib/format';

export function ExtensionPie({ data, height = '400px' }: { data: ExtensionStat[]; height?: string }) {
  const { containerRef } = useECharts(
    data.length > 0
      ? {
          tooltip: {
            trigger: 'item',
            formatter: (info: any) => {
              const d = info.data as any;
              return `${info.name}<br/>Size: ${formatBytes(info.value)}<br/>Files: ${d.count}<br/>(${info.percent}%)`;
            },
          },
          legend: {
            type: 'scroll',
            orient: 'vertical',
            right: 10,
            top: 20,
            bottom: 20,
            textStyle: { color: '#e4e4e7' }
          },
          series: [
            {
              name: 'Extensions',
              type: 'pie',
              radius: ['45%', '70%'],
              avoidLabelOverlap: false,
              itemStyle: {
                borderRadius: 5,
                borderColor: '#18181b',
                borderWidth: 2,
              },
              label: {
                show: false,
                position: 'center',
              },
              emphasis: {
                label: {
                  show: true,
                  fontSize: 20,
                  fontWeight: 'bold',
                  formatter: '{b}\n{d}%'
                },
              },
              labelLine: {
                show: false,
              },
              data: data.map((d) => ({
                name: d.extension || 'No Extension',
                value: d.total_size,
                count: d.count,
              })),
            },
          ],
        }
      : null,
    'dark'
  );

  return <div ref={containerRef} style={{ width: '100%', height }} />;
}
