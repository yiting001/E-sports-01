import { FEE_RATE_BASE } from '../wallet/wallet';

/**
 * 用户会员等级（前后端共享契约）。
 * 等级档位存配置中心（管理端可编辑），用户按累计消费金额自动定级；
 * 等级越高下单折扣（万分比）越优，下单时按当前等级折扣计算应付金额。
 */

/** 会员等级档位 */
export interface MemberLevelTier {
  /** 等级序号（从 1 开始递增） */
  level: number;
  /** 等级名称 */
  name: string;
  /** 晋升到该等级所需累计消费金额（分） */
  minSpendFen: number;
  /** 该等级下单折扣（万分比，10000 = 不打折，9500 = 95 折） */
  discountBp: number;
}

/** 会员等级档位字段约束（前后端共用同一校验规则） */
export const MEMBER_LEVEL_LIMITS = {
  /** 等级名称最大长度 */
  nameMax: 16,
  /** 档位数量上限 */
  tiersMax: 20,
} as const;

/** 默认会员档位（配置中心未设置时回退使用，管理端可覆盖） */
export const MEMBER_LEVEL_DEFAULTS: MemberLevelTier[] = [
  { level: 1, name: '普通会员', minSpendFen: 0, discountBp: 10000 },
  { level: 2, name: '白银会员', minSpendFen: 10000, discountBp: 9800 },
  { level: 3, name: '黄金会员', minSpendFen: 50000, discountBp: 9500 },
  { level: 4, name: '钻石会员', minSpendFen: 200000, discountBp: 9000 },
];

/**
 * 按累计消费金额解析当前会员档位。
 * 取「门槛 ≤ 累计消费」的最高档；档位为空时回退默认档位的第一档。
 */
export function resolveMemberLevel(
  tiers: MemberLevelTier[],
  spendFen: number,
): MemberLevelTier {
  const list = (tiers.length > 0 ? tiers : MEMBER_LEVEL_DEFAULTS)
    .slice()
    .sort((a, b) => a.minSpendFen - b.minSpendFen);
  let matched = list[0];
  for (const tier of list) {
    if (spendFen >= tier.minSpendFen) {
      matched = tier;
    }
  }
  return matched;
}

/** 取下一个待晋升档位（已是最高档返回 null） */
export function nextMemberTier(
  tiers: MemberLevelTier[],
  spendFen: number,
): MemberLevelTier | null {
  const list = (tiers.length > 0 ? tiers : MEMBER_LEVEL_DEFAULTS)
    .slice()
    .sort((a, b) => a.minSpendFen - b.minSpendFen);
  return list.find((tier) => tier.minSpendFen > spendFen) ?? null;
}

/**
 * 按万分比折扣计算折后应付金额（分），向上取整（分位归平台，保证平台不亏损）；
 * 折扣 ≥ 10000 或非法时按原价。
 */
export function calcDiscountedFen(amountFen: number, discountBp: number): number {
  if (discountBp <= 0 || discountBp >= FEE_RATE_BASE) {
    return amountFen;
  }
  return Math.ceil((amountFen * discountBp) / FEE_RATE_BASE);
}

/** 当前用户会员等级视图 */
export interface MemberMineView {
  level: number;
  levelName: string;
  /** 当前下单折扣（万分比） */
  discountBp: number;
  /** 累计消费金额（分） */
  spendFen: number;
  spendYuan: string;
  /** 下一等级名称（已是最高档为空串） */
  nextLevelName: string;
  /** 晋升下一等级还需消费金额（分，已是最高档为 0） */
  nextNeedFen: number;
}
