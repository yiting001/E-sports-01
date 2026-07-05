import { Inject, Injectable } from '@nestjs/common';
import { ORDER_STATUS_TEXT, OrderStatsView, OrderStatus, StatsRange } from '@app/contracts';
import {
  STATS_REPOSITORY,
  StatsRepository,
} from '../../domain/stats-repository.interface';
import { fillTrend, resolveRange } from '../range.util';

/** 商品销量榜条数 */
const TOP_PRODUCTS_LIMIT = 10;

/** 用例：订单运营统计（下单/支付/完成/GMV/折扣让利/状态分布/销量 Top） */
@Injectable()
export class GetOrderStatsUseCase {
  constructor(
    @Inject(STATS_REPOSITORY) private readonly stats: StatsRepository,
  ) {}

  async execute(range: StatsRange): Promise<OrderStatsView> {
    const spec = resolveRange(range);
    const [totals, orderTrend, gmvTrend, statusRows, topProducts] = await Promise.all([
      this.stats.orderTotals(spec),
      this.stats.orderTrend(spec),
      this.stats.gmvTrend(spec),
      this.stats.orderStatusDistribution(spec),
      this.stats.topProducts(spec, TOP_PRODUCTS_LIMIT),
    ]);
    return {
      ...totals,
      orderTrend: fillTrend(spec.buckets, orderTrend),
      gmvTrend: fillTrend(spec.buckets, gmvTrend),
      statusDistribution: statusRows.map((row) => ({
        name: ORDER_STATUS_TEXT[row.name as OrderStatus] ?? row.name,
        count: row.count,
      })),
      topProducts,
    };
  }
}
