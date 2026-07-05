import type { EChartsOption } from 'echarts';
import { FEN_PER_YUAN, type FlowTrendPoint, type NamedCount, type TrendPoint } from '@app/contracts';

/** 分 → 元展示文本（两位小数） */
export function fenToYuanText(fen: number): string {
  return (fen / FEN_PER_YUAN).toFixed(2);
}

/** 折线趋势图配置（value 为计数） */
export function lineTrendOption(points: TrendPoint[], seriesName: string): EChartsOption {
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 48, right: 16, top: 32, bottom: 32 },
    xAxis: { type: 'category', data: points.map((p) => p.bucket) },
    yAxis: { type: 'value', minInterval: 1 },
    series: [
      {
        name: seriesName,
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.15 },
        data: points.map((p) => p.value),
      },
    ],
  };
}

/** 金额趋势柱状图配置（value 为分，展示为元） */
export function moneyTrendOption(points: TrendPoint[], seriesName: string): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => `${fenToYuanText(Number(value ?? 0))} 元`,
    },
    grid: { left: 64, right: 16, top: 32, bottom: 32 },
    xAxis: { type: 'category', data: points.map((p) => p.bucket) },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => fenToYuanText(value) },
    },
    series: [
      {
        name: seriesName,
        type: 'bar',
        data: points.map((p) => p.value),
      },
    ],
  };
}

/** 收支双序列趋势图配置（in/out 为分，展示为元） */
export function flowTrendOption(points: FlowTrendPoint[]): EChartsOption {
  return {
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => `${fenToYuanText(Number(value ?? 0))} 元`,
    },
    legend: { data: ['流入', '流出'] },
    grid: { left: 64, right: 16, top: 40, bottom: 32 },
    xAxis: { type: 'category', data: points.map((p) => p.bucket) },
    yAxis: {
      type: 'value',
      axisLabel: { formatter: (value: number) => fenToYuanText(value) },
    },
    series: [
      { name: '流入', type: 'line', smooth: true, data: points.map((p) => p.inFen) },
      { name: '流出', type: 'line', smooth: true, data: points.map((p) => p.outFen) },
    ],
  };
}

/** 饼图分布配置（count 为计数或金额，金额场景由调用方先转换文案） */
export function pieOption(rows: NamedCount[], seriesName: string): EChartsOption {
  return {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', left: 'left', top: 'middle' },
    series: [
      {
        name: seriesName,
        type: 'pie',
        radius: ['40%', '68%'],
        center: ['60%', '50%'],
        itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
        data: rows.map((row) => ({ name: row.name, value: row.count })),
      },
    ],
  };
}

/** 横向条形榜单配置（销量 Top 等） */
export function rankBarOption(rows: NamedCount[], seriesName: string): EChartsOption {
  const sorted = rows.slice().reverse();
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 120, right: 24, top: 16, bottom: 32 },
    xAxis: { type: 'value', minInterval: 1 },
    yAxis: {
      type: 'category',
      data: sorted.map((row) => row.name),
      axisLabel: { width: 100, overflow: 'truncate' },
    },
    series: [{ name: seriesName, type: 'bar', data: sorted.map((row) => row.count) }],
  };
}
