import { StatsRange, TrendPoint } from '@app/contracts';
import { StatsWindow } from '../domain/stats-repository.interface';

/** 各档位的窗口长度（含当前区间） */
const RANGE_SPAN: Record<StatsRange, number> = {
  [StatsRange.Day]: 30,
  [StatsRange.Month]: 12,
  [StatsRange.Year]: 5,
};

/** 统计窗口解析结果：查询窗口 + 用于零值补齐的完整 bucket 序列 */
export interface RangeSpec extends StatsWindow {
  buckets: string[];
}

/**
 * 把时间范围档位解析为查询窗口与 bucket 标签序列（UTC）：
 * 日=近 30 天按日（YYYY-MM-DD），月=近 12 个月按月（YYYY-MM），年=近 5 年按年（YYYY）。
 */
export function resolveRange(range: StatsRange, now = new Date()): RangeSpec {
  const span = RANGE_SPAN[range];
  const buckets: string[] = [];
  if (range === StatsRange.Day) {
    const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    for (let i = span - 1; i >= 0; i -= 1) {
      buckets.push(new Date(today - i * 86_400_000).toISOString().slice(0, 10));
    }
    return { since: new Date(today - (span - 1) * 86_400_000), unit: 'day', buckets };
  }
  if (range === StatsRange.Month) {
    for (let i = span - 1; i >= 0; i -= 1) {
      buckets.push(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1)).toISOString().slice(0, 7),
      );
    }
    return {
      since: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (span - 1), 1)),
      unit: 'month',
      buckets,
    };
  }
  for (let i = span - 1; i >= 0; i -= 1) {
    buckets.push(String(now.getUTCFullYear() - i));
  }
  return { since: new Date(Date.UTC(now.getUTCFullYear() - (span - 1), 0, 1)), unit: 'year', buckets };
}

/** 用完整 bucket 序列补齐趋势数据的空区间（无数据的区间补 0） */
export function fillTrend(buckets: string[], rows: TrendPoint[]): TrendPoint[] {
  const map = new Map(rows.map((row) => [row.bucket, row.value]));
  return buckets.map((bucket) => ({ bucket, value: map.get(bucket) ?? 0 }));
}
