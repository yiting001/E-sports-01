/**
 * 数据统计仪表盘契约（前后端共享单一来源）。
 * 统计按业务域分块（订单/财务/用户/打手），一块一接口一权限码，
 * 工作台按当前账号权限只渲染可见的统计块；
 * 时间范围统一为日/月/年三档，趋势点的 bucket 由后端按档位聚合。
 */

/** 统计时间范围：日=近 30 天按日，月=近 12 个月按月，年=近 5 年按年 */
export enum StatsRange {
  Day = 'day',
  Month = 'month',
  Year = 'year',
}

/** 时间范围 → 展示文案 */
export const STATS_RANGE_TEXT: Record<StatsRange, string> = {
  [StatsRange.Day]: '日',
  [StatsRange.Month]: '月',
  [StatsRange.Year]: '年',
};

/** 趋势数据点（bucket 为聚合区间标签，如 2026-07-05 / 2026-07 / 2026） */
export interface TrendPoint {
  bucket: string;
  value: number;
}

/** 命名计数（分布类图表通用：状态分布/等级分布/销量榜等） */
export interface NamedCount {
  name: string;
  count: number;
}

/** 收支趋势点（财务块：同一区间的收入与支出，单位分） */
export interface FlowTrendPoint {
  bucket: string;
  inFen: number;
  outFen: number;
}

/** 订单运营统计 */
export interface OrderStatsView {
  /** 区间内创建订单数 */
  totalOrders: number;
  /** 区间内支付成功订单数 */
  paidOrders: number;
  /** 区间内完成订单数 */
  completedOrders: number;
  /** 区间内 GMV：支付成功订单实付总额（分） */
  gmvFen: number;
  /** 区间内会员折扣让利总额（分）= Σ(原价 - 实付) */
  discountFen: number;
  /** 下单量趋势 */
  orderTrend: TrendPoint[];
  /** GMV 趋势（分） */
  gmvTrend: TrendPoint[];
  /** 区间内订单状态分布 */
  statusDistribution: NamedCount[];
  /** 区间内商品销量 Top（按支付成功订单数量合计） */
  topProducts: NamedCount[];
}

/** 财务资金统计（钱包流水聚合，金额单位分） */
export interface FinanceStatsView {
  /** 充值入账总额 */
  rechargeFen: number;
  /** 提现出账总额 */
  withdrawFen: number;
  /** 打手提成支出总额 */
  commissionFen: number;
  /** 罚款收回总额 */
  penaltyFen: number;
  /** 押金缴纳总额 */
  depositFen: number;
  /** 押金退还总额 */
  depositRefundFen: number;
  /** 收支趋势（in=用户资金流入钱包，out=流出） */
  flowTrend: FlowTrendPoint[];
  /** 各流水类型金额分布 */
  typeDistribution: NamedCount[];
}

/** 用户增长统计 */
export interface UserStatsView {
  /** 平台累计用户数 */
  totalUsers: number;
  /** 区间内新注册用户数 */
  newUsers: number;
  /** 注册趋势 */
  userTrend: TrendPoint[];
  /** 会员等级分布（按累计消费实时定级） */
  memberLevelDistribution: NamedCount[];
}

/** 打手生态统计 */
export interface BoosterStatsView {
  /** 累计已入驻打手数 */
  totalBoosters: number;
  /** 当前待审核申请数 */
  pendingBoosters: number;
  /** 区间内新增入驻申请数 */
  newApplications: number;
  /** 申请趋势 */
  applicationTrend: TrendPoint[];
  /** 打手等级分布（按完成单数实时定级） */
  levelDistribution: NamedCount[];
}
