import type { EChartsOption } from 'echarts';
import { FEN_PER_YUAN, type FlowTrendPoint, type NamedCount, type TrendPoint } from '@app/contracts';

/** 分 → 元展示文本（两位小数） */
export function fenToYuanText(fen: number): string {
  return (fen / FEN_PER_YUAN).toFixed(2);
}

function categoryAxis(points: string[]) {
  return {
    type: 'category' as const,
    data: points,
    boundaryGap: true,
    axisLabel: { color: '#909399', hideOverlap: true },
    axisLine: { lineStyle: { color: '#dcdfe6' } },
    axisTick: { alignWithLabel: true },
  };
}

function valueAxis() {
  return {
    type: 'value' as const,
    minInterval: 1,
    axisLabel: { color: '#909399' },
    splitLine: { lineStyle: { color: '#ebeef5' } },
  };
}

function fenAxis() {
  return {
    type: 'value' as const,
    minInterval: FEN_PER_YUAN,
    axisLabel: {
      color: '#909399',
      formatter: (value: number) => {
        const fen = Math.round(value);
        const yuan = Number(fenToYuanText(fen));
        return `${Number.isInteger(yuan) ? yuan : yuan.toFixed(2)}元`;
      },
    },
    splitLine: { lineStyle: { color: '#ebeef5' } },
  };
}

/** 折线趋势图配置（value 为计数） */
export function lineTrendOption(points: TrendPoint[], seriesName: string): EChartsOption {
  return {
    color: ['#409eff'],
    tooltip: { trigger: 'axis' },
    grid: { left: 8, right: 12, top: 20, bottom: 8, containLabel: true },
    xAxis: categoryAxis(points.map((p) => p.bucket)),
    yAxis: valueAxis(),
    series: [
      {
        name: seriesName,
        type: 'line',
        smooth: true,
        areaStyle: { opacity: 0.15 },
        symbolSize: 5,
        data: points.map((p) => p.value),
      },
    ],
  };
}

/** 金额趋势柱状图配置（value 为分，展示为元） */
export function moneyTrendOption(points: TrendPoint[], seriesName: string): EChartsOption {
  return {
    color: ['#67c23a'],
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => `${fenToYuanText(Number(value ?? 0))} 元`,
    },
    grid: { left: 8, right: 12, top: 20, bottom: 8, containLabel: true },
    xAxis: categoryAxis(points.map((p) => p.bucket)),
    yAxis: fenAxis(),
    series: [
      {
        name: seriesName,
        type: 'bar',
        barMaxWidth: 18,
        data: points.map((p) => p.value),
      },
    ],
  };
}

/** 收支双序列趋势图配置（in/out 为分，展示为元） */
export function flowTrendOption(points: FlowTrendPoint[]): EChartsOption {
  return {
    color: ['#67c23a', '#f56c6c'],
    tooltip: {
      trigger: 'axis',
      valueFormatter: (value) => `${fenToYuanText(Number(value ?? 0))} 元`,
    },
    legend: { data: ['流入', '流出'], top: 0, right: 0 },
    grid: { left: 8, right: 12, top: 34, bottom: 8, containLabel: true },
    xAxis: categoryAxis(points.map((p) => p.bucket)),
    yAxis: fenAxis(),
    series: [
      { name: '流入', type: 'line', smooth: true, symbolSize: 5, data: points.map((p) => p.inFen) },
      { name: '流出', type: 'line', smooth: true, symbolSize: 5, data: points.map((p) => p.outFen) },
    ],
  };
}

/** 饼图分布配置（count 为计数或金额，金额场景由调用方先转换文案） */
export function pieOption(rows: NamedCount[], seriesName: string): EChartsOption {
  return {
    color: ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399'],
    tooltip: { trigger: 'item' },
    legend: { bottom: 0, left: 'center', type: 'scroll' },
    series: [
      {
        name: seriesName,
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '43%'],
        avoidLabelOverlap: true,
        itemStyle: { borderRadius: 4, borderColor: '#fff', borderWidth: 2 },
        label: { color: '#606266' },
        data: rows.map((row) => ({ name: row.name, value: row.count })),
      },
    ],
  };
}

/** 横向条形榜单配置（销量 Top 等） */
export function rankBarOption(rows: NamedCount[], seriesName: string): EChartsOption {
  const sorted = rows.slice().reverse();
  return {
    color: ['#409eff'],
    tooltip: { trigger: 'axis' },
    grid: { left: 8, right: 12, top: 8, bottom: 8, containLabel: true },
    xAxis: valueAxis(),
    yAxis: {
      type: 'category',
      data: sorted.map((row) => row.name),
      axisLabel: { color: '#909399', width: 96, overflow: 'truncate' },
      axisLine: { lineStyle: { color: '#dcdfe6' } },
      axisTick: { show: false },
    },
    series: [{ name: seriesName, type: 'bar', barMaxWidth: 16, data: sorted.map((row) => row.count) }],
  };
}
