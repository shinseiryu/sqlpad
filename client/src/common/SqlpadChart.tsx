import { BarChart, LineChart, ScatterChart } from 'echarts/charts';
import {
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
} from 'echarts/components';
import * as echarts from 'echarts/core';
import { CanvasRenderer } from 'echarts/renderers';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StatementColumn, StatementResults } from '../types';
import { useElementSize } from '../utilities/use-element-size';
import { delChartRef, setChartRef } from './chartRef';
import ErrorBlock from './ErrorBlock';
import {
  ChartConfiguration,
  layoutChart,
  prepareChart,
} from './getChartOption';
import SpinKitCube from './SpinKitCube';

echarts.use([
  BarChart,
  LineChart,
  ScatterChart,
  DataZoomComponent,
  GridComponent,
  LegendComponent,
  TitleComponent,
  TooltipComponent,
  VisualMapComponent,
  CanvasRenderer,
]);

export interface Props {
  isRunning: boolean;
  queryError?: string;
  columns?: StatementColumn[];
  rows?: StatementResults;
  chartConfiguration: ChartConfiguration;
  queryId: string;
}

function SqlpadChart({
  isRunning,
  queryError,
  columns,
  rows,
  chartConfiguration,
  queryId,
}: Props) {
  const [measureRef, size] = useElementSize();
  const [chart, setChart] = useState<echarts.ECharts | null>(null);

  // Create the chart with its element, dispose of it on unmount
  const containerRef = useCallback(
    (element: HTMLDivElement | null) => {
      const cleanupMeasure = measureRef(element);
      if (!element) {
        return undefined;
      }
      const instance = echarts.init(element);
      setChart(instance);
      return () => {
        cleanupMeasure?.();
        instance.dispose();
        setChart(null);
      };
    },
    [measureRef],
  );

  // Register for PNG export; a new query keeps its chart when saved
  useEffect(() => {
    if (!chart) {
      return;
    }
    setChartRef(queryId, chart);
    return () => delChartRef(queryId, chart);
  }, [chart, queryId]);

  const prepared = useMemo(
    () => (isRunning ? null : prepareChart(chartConfiguration, columns, rows)),
    [isRunning, chartConfiguration, columns, rows],
  );

  const { width, height } = size;
  useEffect(() => {
    if (!chart || chart.isDisposed() || width <= 0 || height <= 0) {
      return;
    }
    chart.resize();
    if (prepared) {
      chart.setOption(layoutChart(prepared, { width, height }), {
        notMerge: true,
      });
    } else {
      chart.clear();
    }
  }, [chart, prepared, width, height]);

  if (queryError) {
    return <ErrorBlock>{queryError}</ErrorBlock>;
  }

  return (
    <div className="h-100 w-100" style={{ position: 'relative' }}>
      <div
        ref={containerRef}
        className="h-100 w-100"
        style={{ visibility: isRunning ? 'hidden' : undefined }}
      />
      {isRunning && (
        <div className="flex-center" style={{ position: 'absolute', inset: 0 }}>
          <SpinKitCube />
        </div>
      )}
    </div>
  );
}

export default SqlpadChart;
