import type { EChartsCoreOption } from 'echarts/core';
import { ChartFields, StatementColumn, StatementResults } from '../types';
import chartDefinitions from '../utilities/chartDefinitions';

/**
 * Builds ECharts options from a saved chart configuration
 * (`chartType` plus a map of chart field id -> column name or setting).
 *
 * Work is split in two:
 * - prepareChart converts rows into series data (cost scales with rows)
 * - layoutChart places facet grids for a container size (cheap; reruns on resize)
 */

export interface ChartConfiguration {
  chartType?: string;
  fields?: ChartFields;
}

export interface ChartSize {
  width: number;
  height: number;
}

type AxisKind = 'value' | 'time' | 'category';
type Cell = string | number | null;
type Point = Cell[];

// ECharts default palette, assigned explicitly so a group keeps its color
// across facets and its trendline matches it
const PALETTE = [
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
  '#ea7ccc',
];

const MIN_SYMBOL = 4;
const MAX_SYMBOL = 30;

/** Checkbox settings may be saved as booleans or as "true"/"false" strings */
function isTrue(value: unknown) {
  return (
    value === true ||
    (typeof value === 'string' && value.toLowerCase() === 'true')
  );
}

function columnKind(column?: StatementColumn): AxisKind {
  if (column?.datatype === 'date' || column?.datatype === 'datetime') {
    return 'time';
  }
  if (column?.datatype === 'number') {
    return 'value';
  }
  return 'category';
}

function toTime(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const time = new Date(value as string).getTime();
  return Number.isNaN(time) ? null : time;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

/** Category label for any value; dates without a time of day show as dates */
function toLabel(value: unknown, column?: StatementColumn): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (columnKind(column) === 'time') {
    const time = toTime(value);
    if (time !== null) {
      const iso = new Date(time).toISOString();
      return iso.endsWith('T00:00:00.000Z')
        ? iso.slice(0, 10)
        : iso.slice(0, 19).replace('T', ' ');
    }
  }
  return String(value);
}

function convert(value: unknown, kind: AxisKind, column?: StatementColumn) {
  if (kind === 'time') {
    return toTime(value);
  }
  if (kind === 'value') {
    return toNumber(value);
  }
  return toLabel(value, column);
}

/** Distinct labels of a column, sorted when the column is a number or date */
function distinctLabels(
  rows: StatementResults,
  index: number,
  column: StatementColumn,
) {
  const seen = new Map<string, number | string>();
  rows.forEach((row) => {
    const label = toLabel(row[index], column);
    if (!seen.has(label)) {
      const kind = columnKind(column);
      const sortKey =
        kind === 'time'
          ? (toTime(row[index]) ?? 0)
          : kind === 'value'
            ? (toNumber(row[index]) ?? 0)
            : label;
      seen.set(label, sortKey);
    }
  });
  const labels = [...seen.keys()];
  if (columnKind(column) !== 'category') {
    labels.sort((a, b) => (seen.get(a) as number) - (seen.get(b) as number));
  }
  return labels;
}

/** Least squares line through the points, as its two end points */
function trendline(points: Point[], categories?: string[]): Point[] | null {
  const xy: [number, number][] = [];
  points.forEach((p) => {
    const x = categories ? categories.indexOf(p[0] as string) : p[0];
    const y = p[1];
    if (typeof x === 'number' && x >= 0 && typeof y === 'number') {
      xy.push([x, y]);
    }
  });
  if (xy.length < 2) {
    return null;
  }
  const n = xy.length;
  const sumX = xy.reduce((s, [x]) => s + x, 0);
  const sumY = xy.reduce((s, [, y]) => s + y, 0);
  const sumXY = xy.reduce((s, [x, y]) => s + x * y, 0);
  const sumXX = xy.reduce((s, [x]) => s + x * x, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return null;
  }
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  const xs = xy.map(([x]) => x);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const end = (x: number): Point => [
    categories ? categories[x] : x,
    intercept + slope * x,
  ];
  return [end(minX), end(maxX)];
}

interface Spec {
  mark: 'line' | 'scatter' | 'bar';
  horizontal: boolean;
  stacked: boolean;
  /** For bars: category column and value column; otherwise x and y */
  xField: string;
  yField: string;
  groupField?: string;
  colorValueField?: string;
  sizeField?: string;
  colFacet?: string;
  rowFacet?: string;
  trendline: boolean;
  filter: boolean;
  yMin?: number;
  yMax?: number;
}

/** Maps saved fields of each chart type onto one spec */
function getSpec(
  chartType: string,
  fields: ChartFields,
  columnsByName: Map<string, StatementColumn>,
): Spec | null {
  const field = (id: string): string | undefined => {
    const name = fields[id];
    return typeof name === 'string' && columnsByName.has(name)
      ? name
      : undefined;
  };
  const setting = (id: string) => {
    const value = toNumber(fields[id]);
    return value === null ? undefined : value;
  };

  const base = {
    trendline: false,
    filter: false,
    stacked: false,
    horizontal: false,
  };

  switch (chartType) {
    case 'line':
    case 'bubble': {
      const x = field('x');
      const y = field('y');
      if (!x || !y) {
        return null;
      }
      const spec: Spec = {
        ...base,
        mark: chartType === 'line' ? 'line' : 'scatter',
        xField: x,
        yField: y,
        sizeField: field('size'),
        colFacet: field('xFacet'),
        rowFacet: field('yFacet'),
        trendline: isTrue(fields.trendline),
        filter: isTrue(fields.filter),
      };
      if (chartType === 'line') {
        spec.groupField = field('split');
        spec.yMin = setting('yMin');
        spec.yMax = setting('yMax');
      } else {
        const color = field('color');
        if (color && columnKind(columnsByName.get(color)) === 'value') {
          spec.colorValueField = color;
        } else {
          spec.groupField = color;
        }
      }
      return spec;
    }
    case 'bar':
    case 'verticalbar':
    case 'stacked-bar-horizontal':
    case 'stacked-bar-vertical': {
      const label = field('barlabel');
      const value = field('barvalue');
      if (!label || !value) {
        return null;
      }
      const horizontal =
        chartType === 'bar' || chartType === 'stacked-bar-horizontal';
      const stacked = chartType.startsWith('stacked');
      return {
        ...base,
        mark: 'bar',
        horizontal,
        stacked,
        xField: label,
        yField: value,
        groupField: stacked ? field('color') : undefined,
        // Facets follow the axis they split: the label facet splits the
        // label axis, the value facet splits the value axis
        colFacet: horizontal ? field('valueFacet') : field('labelFacet'),
        rowFacet: horizontal ? field('labelFacet') : field('valueFacet'),
      };
    }
    default:
      return null;
  }
}

interface PreparedSeries {
  name: string;
  colorIndex: number;
  facet: number;
  data: Point[];
}

export interface PreparedChart {
  spec: Spec;
  colLabels: string[];
  rowLabels: string[];
  groups: string[];
  series: PreparedSeries[];
  /** Kind of the horizontal and vertical axes */
  xKind: AxisKind;
  yKind: AxisKind;
  /** Category axis values shared by all facets */
  categories?: string[];
  /** Value range shared by facets, per axis, for numeric/time axes */
  xRange?: [number, number];
  yRange?: [number, number];
  sizeRange?: [number, number];
  colorRange?: [number, number];
  pointCount: number;
}

/** Widens a range to round numbers, so shared facet scales get clean ticks */
function niceRange([min, max]: [number, number]): [number, number] {
  const span = max - min || Math.abs(max) || 1;
  const magnitude = 10 ** Math.floor(Math.log10(span));
  const step = [1, 2, 5, 10]
    .map((m) => m * magnitude)
    .find((s) => span / s <= 10)!;
  return [Math.floor(min / step) * step, Math.ceil(max / step) * step];
}

function range(values: Cell[]): [number, number] | undefined {
  const nums = values.filter((v): v is number => typeof v === 'number');
  if (!nums.length) {
    return undefined;
  }
  return [Math.min(...nums), Math.max(...nums)];
}

export function prepareChart(
  config: ChartConfiguration,
  columns?: StatementColumn[],
  rows?: StatementResults,
): PreparedChart | null {
  const { chartType, fields } = config || {};
  if (!chartType || !fields || !columns || !rows || !rows.length) {
    return null;
  }
  if (!chartDefinitions.some((def) => def.chartType === chartType)) {
    return null;
  }

  const columnsByName = new Map(columns.map((c) => [c.name, c]));
  const indexByName = new Map(columns.map((c, i) => [c.name, i]));
  const spec = getSpec(chartType, fields, columnsByName);
  if (!spec) {
    return null;
  }

  const col = (name?: string) => (name ? columnsByName.get(name) : undefined);
  const idx = (name: string) => indexByName.get(name) as number;

  const colLabels = spec.colFacet
    ? distinctLabels(rows, idx(spec.colFacet), col(spec.colFacet)!)
    : [''];
  const rowLabels = spec.rowFacet
    ? distinctLabels(rows, idx(spec.rowFacet), col(spec.rowFacet)!)
    : [''];
  const groups = spec.groupField
    ? distinctLabels(rows, idx(spec.groupField), col(spec.groupField)!)
    : [''];

  const facetOf = (row: unknown[]) => {
    const c = spec.colFacet
      ? colLabels.indexOf(toLabel(row[idx(spec.colFacet)], col(spec.colFacet)))
      : 0;
    const r = spec.rowFacet
      ? rowLabels.indexOf(toLabel(row[idx(spec.rowFacet)], col(spec.rowFacet)))
      : 0;
    return r * colLabels.length + c;
  };
  const groupOf = (row: unknown[]) =>
    spec.groupField
      ? groups.indexOf(toLabel(row[idx(spec.groupField)], col(spec.groupField)))
      : 0;

  const facetCount = colLabels.length * rowLabels.length;
  const seriesKey = (facet: number, group: number) =>
    facet * groups.length + group;
  const seriesData: Point[][] = Array.from(
    { length: facetCount * groups.length },
    () => [],
  );

  let xKind: AxisKind;
  let yKind: AxisKind;
  let categories: string[] | undefined;

  if (spec.mark === 'bar') {
    // One bar per label; repeated labels in a series are summed
    categories = distinctLabels(rows, idx(spec.xField), col(spec.xField)!);
    const sums = seriesData.map(() => new Map<string, number>());
    rows.forEach((row) => {
      const label = toLabel(row[idx(spec.xField)], col(spec.xField));
      const value = toNumber(row[idx(spec.yField)]);
      if (value === null) {
        return;
      }
      const sum = sums[seriesKey(facetOf(row), groupOf(row))];
      sum.set(label, (sum.get(label) ?? 0) + value);
    });
    sums.forEach((sum, i) => {
      seriesData[i] = categories!.map((label) => {
        const value = sum.has(label) ? sum.get(label)! : null;
        return spec.horizontal ? [value, label] : [label, value];
      });
    });
    xKind = spec.horizontal ? 'value' : 'category';
    yKind = spec.horizontal ? 'category' : 'value';
  } else {
    xKind = columnKind(col(spec.xField));
    yKind = columnKind(col(spec.yField));
    if (xKind === 'category') {
      categories = distinctLabels(rows, idx(spec.xField), col(spec.xField)!);
    }
    rows.forEach((row) => {
      const point: Point = [
        convert(row[idx(spec.xField)], xKind, col(spec.xField)),
        convert(row[idx(spec.yField)], yKind, col(spec.yField)),
        spec.sizeField ? toNumber(row[idx(spec.sizeField)]) : null,
        spec.colorValueField ? toNumber(row[idx(spec.colorValueField)]) : null,
      ];
      if (point[0] === null || point[1] === null) {
        return;
      }
      seriesData[seriesKey(facetOf(row), groupOf(row))].push(point);
    });
    if (spec.mark === 'line' && xKind !== 'category') {
      seriesData.forEach((data) =>
        data.sort((a, b) => (a[0] as number) - (b[0] as number)),
      );
    }
  }

  const series: PreparedSeries[] = [];
  seriesData.forEach((data, i) => {
    const facet = Math.floor(i / groups.length);
    const group = i % groups.length;
    if (data.some((p) => p[0] !== null && p[1] !== null)) {
      series.push({
        name: groups[group] || spec.yField,
        colorIndex: group,
        facet,
        data,
      });
    }
  });
  if (!series.length) {
    return null;
  }

  const all = series.flatMap((s) => s.data);
  // Bars: value axis starts at zero; stacked bars range over the stack totals
  let valueRange: [number, number] | undefined;
  if (spec.mark === 'bar') {
    const valueAt = spec.horizontal ? 0 : 1;
    let values: Cell[] = all.map((p) => p[valueAt]);
    if (spec.stacked) {
      const totals = new Map<string, number>();
      series.forEach((s) =>
        s.data.forEach((p) => {
          const key = `${s.facet}|${p[1 - valueAt]}`;
          const value = (p[valueAt] as number | null) ?? 0;
          totals.set(key, (totals.get(key) ?? 0) + value);
        }),
      );
      values = [...totals.values()];
    }
    const r = range(values);
    valueRange = r && [Math.min(0, r[0]), Math.max(0, r[1])];
  }

  return {
    spec,
    colLabels,
    rowLabels,
    groups,
    series,
    xKind,
    yKind,
    categories,
    xRange:
      xKind === 'category'
        ? undefined
        : spec.mark === 'bar'
          ? valueRange
          : range(all.map((p) => p[0])),
    yRange:
      yKind === 'category'
        ? undefined
        : spec.mark === 'bar'
          ? valueRange
          : range(all.map((p) => p[1])),
    sizeRange: spec.sizeField ? range(all.map((p) => p[2])) : undefined,
    colorRange: spec.colorValueField ? range(all.map((p) => p[3])) : undefined,
    pointCount: all.length,
  };
}

function symbolSizer(sizeRange?: [number, number]) {
  if (!sizeRange) {
    return undefined;
  }
  const [min, max] = sizeRange;
  return (point: Point) => {
    const value = point[2];
    if (typeof value !== 'number') {
      return MIN_SYMBOL;
    }
    if (max === min) {
      return (MIN_SYMBOL + MAX_SYMBOL) / 2;
    }
    return (
      MIN_SYMBOL + ((value - min) / (max - min)) * (MAX_SYMBOL - MIN_SYMBOL)
    );
  };
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const LEGEND_HEIGHT = 32;
const FACET_TITLE_HEIGHT = 20;
const ZOOM_SIZE = 36;
const PADDING = 8;
const FACET_GAP = 16;
const LABEL_HEADROOM = 10;

export function layoutChart(
  prepared: PreparedChart,
  size: ChartSize,
): EChartsCoreOption {
  const { spec, colLabels, rowLabels, groups, xKind, yKind } = prepared;
  const facetCols = colLabels.length;
  const facetRows = rowLabels.length;
  const faceted = facetCols * facetRows > 1;
  const showLegend = groups.length > 1 || Boolean(spec.colorValueField);

  const top = PADDING + (showLegend ? LEGEND_HEIGHT : 0);
  const bottom = PADDING + (spec.filter ? ZOOM_SIZE : 0);
  const left = PADDING;
  const right = PADDING + (spec.filter ? ZOOM_SIZE : 0);
  const titleHeight = faceted ? FACET_TITLE_HEIGHT : 0;
  const cellWidth = Math.max(
    40,
    (size.width - left - right - FACET_GAP * (facetCols - 1)) / facetCols,
  );
  const cellHeight = Math.max(
    40,
    (size.height - top - bottom - FACET_GAP * (facetRows - 1)) / facetRows,
  );

  const grids: object[] = [];
  const xAxes: object[] = [];
  const yAxes: object[] = [];
  const titles: object[] = [];

  // With facets, scales are shared, so only the outer facets (left column,
  // bottom row) show axis names and tick labels
  const axis = (
    kind: AxisKind,
    name: string,
    outer: boolean,
    gridIndex: number,
    isY: boolean,
  ) => {
    const isValueOfBar = spec.mark === 'bar' && kind !== 'category';
    const shared = isY ? prepared.yRange : prepared.xRange;
    const result: Record<string, unknown> = {
      type: kind,
      gridIndex,
      name: outer ? name : undefined,
      nameLocation: 'middle',
      nameGap: isY ? 40 : 28,
      scale: !isValueOfBar,
      axisLabel: { show: outer, hideOverlap: true },
    };
    if (kind === 'category') {
      result.data = prepared.categories;
      // Bars read top-down when horizontal
      result.inverse = isY && spec.mark === 'bar';
    } else if (faceted && shared) {
      // Facets share one scale so they can be compared
      const [min, max] = kind === 'value' ? niceRange(shared) : shared;
      result.min = min;
      result.max = max;
    }
    if (isY && spec.yMin !== undefined) {
      result.min = spec.yMin;
    }
    if (isY && spec.yMax !== undefined) {
      result.max = spec.yMax;
    }
    return result;
  };

  const xName = spec.horizontal ? spec.yField : spec.xField;
  const yName = spec.horizontal ? spec.xField : spec.yField;

  for (let r = 0; r < facetRows; r++) {
    for (let c = 0; c < facetCols; c++) {
      const cellLeft = left + c * (cellWidth + FACET_GAP);
      const cellTop = top + r * (cellHeight + FACET_GAP);
      const rect = {
        left: cellLeft,
        top: cellTop + titleHeight,
        width: cellWidth,
        height: cellHeight - titleHeight,
      };
      const gridIndex = grids.length;
      // Axis labels must fit within outerBounds (the grid shrinks if not).
      // Leave room above the plot for the top tick label, so every facet
      // keeps the same plot height and gridlines line up across facets.
      grids.push({
        ...rect,
        outerBounds: {
          ...rect,
          top: rect.top - LABEL_HEADROOM,
          height: rect.height + LABEL_HEADROOM,
        },
      });
      xAxes.push(axis(xKind, xName, r === facetRows - 1, gridIndex, false));
      yAxes.push(axis(yKind, yName, c === 0, gridIndex, true));
      if (faceted) {
        titles.push({
          text: [colLabels[c], rowLabels[r]].filter(Boolean).join(' · '),
          left: cellLeft + cellWidth / 2,
          top: cellTop,
          textAlign: 'center',
          textStyle: { fontSize: 12, fontWeight: 'normal' },
        });
      }
    }
  }

  const symbolSize = symbolSizer(prepared.sizeRange);
  const series: object[] = [];
  const dataSeriesIndexes: number[] = [];

  prepared.series.forEach((s) => {
    const color = PALETTE[s.colorIndex % PALETTE.length];
    dataSeriesIndexes.push(series.length);
    const common = {
      name: s.name,
      xAxisIndex: s.facet,
      yAxisIndex: s.facet,
      data: s.data,
      // the visual map colors points when color is a numeric column
      itemStyle: spec.colorValueField ? undefined : { color },
    };
    if (spec.mark === 'bar') {
      series.push({
        ...common,
        type: 'bar',
        stack: spec.stacked ? `facet${s.facet}` : undefined,
      });
    } else {
      series.push({
        ...common,
        type: spec.mark,
        symbolSize: symbolSize ?? (spec.mark === 'line' ? 4 : 8),
        showSymbol: spec.mark === 'line' ? Boolean(symbolSize) : undefined,
        lineStyle: spec.mark === 'line' ? { color } : undefined,
        dimensions: ['x', 'y', 'size', 'color'],
        encode: { x: 0, y: 1, tooltip: [0, 1, 2, 3] },
      });
    }
    if (spec.trendline && spec.mark !== 'bar') {
      const ends = trendline(
        s.data,
        xKind === 'category' ? prepared.categories : undefined,
      );
      if (ends) {
        series.push({
          // same name, so the legend toggles a group with its trendline
          name: s.name,
          type: 'line',
          xAxisIndex: s.facet,
          yAxisIndex: s.facet,
          data: ends,
          showSymbol: false,
          silent: true,
          tooltip: { show: false },
          itemStyle: { color: spec.colorValueField ? '#666' : color },
          lineStyle: {
            type: 'dashed',
            width: 1.5,
            color: spec.colorValueField ? '#666' : color,
          },
        });
      }
    }
  });

  const allGrids = grids.map((_, i) => i);
  const dataZoom = spec.filter
    ? [
        {
          type: 'slider',
          xAxisIndex: allGrids,
          filterMode: 'filter',
          left: left + 40,
          right,
          bottom: PADDING,
          height: ZOOM_SIZE - 16,
        },
        {
          type: 'slider',
          yAxisIndex: allGrids,
          filterMode: 'empty',
          right: PADDING,
          top,
          bottom,
          width: ZOOM_SIZE - 16,
        },
      ]
    : undefined;

  const valueLabel = (column: string, value: unknown, kind: AxisKind) =>
    kind === 'time' && typeof value === 'number'
      ? toLabel(value, {
          name: column,
          datatype: 'datetime',
        } as StatementColumn)
      : value;

  return {
    animation: prepared.pointCount < 2000,
    useUTC: true,
    color: PALETTE,
    title: titles,
    grid: grids,
    xAxis: xAxes,
    yAxis: yAxes,
    series,
    dataZoom,
    legend:
      groups.length > 1
        ? {
            type: 'scroll',
            top: PADDING,
            data: groups.map((name, i) => ({
              name,
              itemStyle: { color: PALETTE[i % PALETTE.length] },
            })),
          }
        : undefined,
    visualMap:
      spec.colorValueField && prepared.colorRange
        ? {
            type: 'continuous',
            dimension: 3,
            seriesIndex: dataSeriesIndexes,
            min: prepared.colorRange[0],
            max: prepared.colorRange[1],
            orient: 'horizontal',
            top: 0,
            right: PADDING,
            itemHeight: 120,
            text: [String(prepared.colorRange[1]), spec.colorValueField],
            inRange: { color: ['#c6dbef', '#08519c'] },
          }
        : undefined,
    tooltip:
      spec.mark === 'bar'
        ? { trigger: 'axis', axisPointer: { type: 'shadow' } }
        : {
            trigger: spec.mark === 'line' ? 'axis' : 'item',
            ...(spec.mark === 'scatter' && {
              formatter: (params: { seriesName: string; value: Point }) => {
                const [x, y, size, color] = params.value;
                const lines = [
                  [spec.xField, valueLabel(spec.xField, x, xKind)],
                  [spec.yField, valueLabel(spec.yField, y, yKind)],
                ];
                if (spec.sizeField) lines.push([spec.sizeField, size]);
                if (spec.colorValueField)
                  lines.push([spec.colorValueField, color]);
                if (spec.groupField)
                  lines.push([spec.groupField, params.seriesName]);
                return lines
                  .map(
                    ([name, value]) =>
                      `${escapeHtml(name)}: <b>${escapeHtml(value)}</b>`,
                  )
                  .join('<br/>');
              },
            }),
          },
  };
}
