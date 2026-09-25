import { useRef, useEffect } from 'react';
import * as echarts from 'echarts';

export function useECharts(options: echarts.EChartsOption | null, theme: 'dark' | 'light' = 'dark') {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = echarts.init(containerRef.current, theme, { renderer: 'canvas' });
    chartRef.current = chart;

    const ro = new ResizeObserver(() => chart.resize());
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [theme]);

  useEffect(() => {
    if (chartRef.current && options) {
      chartRef.current.setOption(options, { notMerge: true });
    }
  }, [options]);

  return { containerRef, chartRef };
}
