import { FEE_RATE_BASE } from '../wallet/wallet';

/**
 * 打手等级（前后端共享契约）。
 * 等级档位存配置中心（管理端可编辑），打手按累计完成订单数自动定级；
 * 等级越高提成比例（万分比）越高，完成订单时按当前等级费率计提成入钱包。
 */

/** 打手等级档位 */
export interface BoosterLevelTier {
  /** 等级序号（从 1 开始递增） */
  level: number;
  /** 等级名称 */
  name: string;
  /** 晋升到该等级所需累计完成订单数 */
  minCompletedOrders: number;
  /** 该等级订单提成比例（万分比，如 7000 = 70%） */
  commissionRateBp: number;
}

/** 打手等级档位字段约束（前后端共用同一校验规则） */
export const BOOSTER_LEVEL_LIMITS = {
  /** 等级名称最大长度 */
  nameMax: 16,
  /** 档位数量上限 */
  tiersMax: 20,
} as const;

/** 默认等级档位（配置中心未设置时回退使用，管理端可覆盖） */
export const BOOSTER_LEVEL_DEFAULTS: BoosterLevelTier[] = [
  { level: 1, name: '青铜', minCompletedOrders: 0, commissionRateBp: 7000 },
  { level: 2, name: '白银', minCompletedOrders: 20, commissionRateBp: 7500 },
  { level: 3, name: '黄金', minCompletedOrders: 50, commissionRateBp: 8000 },
  { level: 4, name: '铂金', minCompletedOrders: 100, commissionRateBp: 8500 },
  { level: 5, name: '王者', minCompletedOrders: 200, commissionRateBp: 9000 },
];

/** 打手默认参数（配置中心未设置时回退使用） */
export const BOOSTER_DEFAULTS = {
  /** 押金最低交付额（分，接单门槛） */
  depositMinFen: 10000,
  /** 押金最高交付额（分，缴纳上限） */
  depositMaxFen: 100000,
  /** 提交入驻申请是否要求已通过实名认证 */
  requireRealname: true,
} as const;

/**
 * 按累计完成订单数解析当前等级档位。
 * 取「门槛 ≤ 完成数」的最高档；档位为空时回退默认档位的第一档。
 */
export function resolveBoosterLevel(
  tiers: BoosterLevelTier[],
  completedOrders: number,
): BoosterLevelTier {
  const list = (tiers.length > 0 ? tiers : BOOSTER_LEVEL_DEFAULTS)
    .slice()
    .sort((a, b) => a.minCompletedOrders - b.minCompletedOrders);
  let matched = list[0];
  for (const tier of list) {
    if (completedOrders >= tier.minCompletedOrders) {
      matched = tier;
    }
  }
  return matched;
}

/**
 * 按万分比费率计算订单提成（分），向下取整（分位归平台，保证平台不亏损）。
 */
export function calcCommissionFen(amountFen: number, rateBp: number): number {
  if (rateBp <= 0) {
    return 0;
  }
  return Math.floor((amountFen * rateBp) / FEE_RATE_BASE);
}
