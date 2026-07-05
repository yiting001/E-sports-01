import { FlowTrendPoint, NamedCount, TrendPoint } from '@app/contracts';

/** 统计窗口：起点 + 聚合粒度（由 StatsRange 解析而来） */
export interface StatsWindow {
  /** 窗口起点（含） */
  since: Date;
  /** date_trunc 聚合粒度 */
  unit: 'day' | 'month' | 'year';
}

/** 订单汇总数字 */
export interface OrderTotals {
  totalOrders: number;
  paidOrders: number;
  completedOrders: number;
  gmvFen: number;
  discountFen: number;
}

/** 打手汇总数字 */
export interface BoosterTotals {
  totalBoosters: number;
  pendingBoosters: number;
  newApplications: number;
}

/** 各流水类型金额合计（type → 总额分） */
export interface TxnTypeTotal {
  type: string;
  totalFen: number;
}

export const STATS_REPOSITORY = Symbol('STATS_REPOSITORY');

/**
 * 仪表盘统计仓储端口：只读聚合查询（跨模块表只读，不做任何写入）。
 * 所有查询按当前租户上下文过滤，按窗口起点与粒度聚合。
 */
export interface StatsRepository {
  /** 订单汇总（窗口内创建/支付/完成数与 GMV、折扣让利） */
  orderTotals(window: StatsWindow): Promise<OrderTotals>;
  /** 下单量趋势（按创建时间） */
  orderTrend(window: StatsWindow): Promise<TrendPoint[]>;
  /** GMV 趋势（按支付时间，值为实付分） */
  gmvTrend(window: StatsWindow): Promise<TrendPoint[]>;
  /** 窗口内订单状态分布 */
  orderStatusDistribution(window: StatsWindow): Promise<NamedCount[]>;
  /** 窗口内商品销量 Top（支付成功订单数量合计） */
  topProducts(window: StatsWindow, limit: number): Promise<NamedCount[]>;
  /** 窗口内各流水类型金额合计 */
  txnTypeTotals(window: StatsWindow): Promise<TxnTypeTotal[]>;
  /** 窗口内收支趋势（按流水方向合计） */
  flowTrend(window: StatsWindow): Promise<FlowTrendPoint[]>;
  /** 平台累计用户数 */
  totalUsers(): Promise<number>;
  /** 窗口内新注册用户数 */
  newUsers(window: StatsWindow): Promise<number>;
  /** 注册趋势 */
  userTrend(window: StatsWindow): Promise<TrendPoint[]>;
  /** 会员累计消费在 [minFen, maxFen) 区间的人数（maxFen 为空表示不设上限） */
  countMembersBySpend(minFen: number, maxFen: number | null): Promise<number>;
  /** 打手汇总（累计入驻/待审 + 窗口内新申请） */
  boosterTotals(window: StatsWindow): Promise<BoosterTotals>;
  /** 入驻申请趋势（按创建时间） */
  applicationTrend(window: StatsWindow): Promise<TrendPoint[]>;
  /** 已入驻打手完成单数在 [min, max) 区间的人数（max 为空表示不设上限） */
  countBoostersByCompleted(min: number, max: number | null): Promise<number>;
}
