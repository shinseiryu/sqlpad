import type { ECharts } from 'echarts/core';

/**
 * Chart instances by query id, so toolbars outside the chart component
 * (editor chart toolbar, chart-only page) can export the rendered chart.
 */
const charts = new Map<string, ECharts>();

export function setChartRef(queryId: string, chart: ECharts) {
  charts.set(queryId, chart);
}

export function delChartRef(queryId: string, chart: ECharts) {
  if (charts.get(queryId) === chart) {
    charts.delete(queryId);
  }
}

export function exportPng(queryId: string, fileName: string) {
  const chart = charts.get(queryId);
  if (!chart) {
    return;
  }
  const url = chart.getDataURL({
    type: 'png',
    pixelRatio: 2,
    backgroundColor: '#fff',
    excludeComponents: ['dataZoom'],
  });
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName || 'chart'}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
