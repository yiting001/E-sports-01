import { FEE_RATE_BASE } from '../wallet/wallet';

/**
 * 优惠券（前后端共享契约）。
 * 管理端发券（满减/折扣、门槛、库存、限领、有效期），
 * C 端领券中心领取、我的优惠券查看，下单结算时选券抵扣。
 */

/** 优惠方式 */
export enum CouponType {
  /** 满减：value 为减免金额（分） */
  Fixed = 'fixed',
  /** 折扣：value 为折扣万分比（9000 = 9 折） */
  Percent = 'percent',
}

/** 用户券状态 */
export enum UserCouponStatus {
  /** 未使用 */
  Unused = 'unused',
  /** 已使用 */
  Used = 'used',
}

/** 优惠券字段约束（DTO 校验与前端输入限制共享） */
export const COUPON_LIMITS = {
  /** 券名最大长度 */
  titleMax: 32,
  /** 单券库存上限 */
  totalCountMax: 1000000,
  /** 单用户限领上限 */
  perUserLimitMax: 100,
} as const;

/** 新建/编辑优惠券入参（管理端） */
export interface UpsertCouponPayload {
  /** 券名 */
  title: string;
  /** 优惠方式 */
  type: CouponType;
  /** 满减金额（分）或折扣万分比，语义随 type */
  value: number;
  /** 使用门槛：订单实付满多少分可用（0 = 无门槛） */
  thresholdFen: number;
  /** 发行总量 */
  totalCount: number;
  /** 单用户限领张数 */
  perUserLimit: number;
  /** 有效期开始（ISO 时间） */
  validFrom: string;
  /** 有效期结束（ISO 时间） */
  validTo: string;
  /** 是否上架（仅上架的券可领取） */
  enabled: boolean;
}

/** 优惠券视图（管理端） */
export interface CouponView extends UpsertCouponPayload {
  id: string;
  /** 已领取张数 */
  issuedCount: number;
  createdAt: string;
  updatedAt: string;
}

/** 领券中心视图（C 端） */
export interface CouponPublicView {
  id: string;
  title: string;
  type: CouponType;
  value: number;
  thresholdFen: number;
  validFrom: string;
  validTo: string;
  /** 剩余可领张数 */
  remaining: number;
  /** 我已领取张数 */
  claimedByMe: number;
  /** 单用户限领张数 */
  perUserLimit: number;
}

/** 我的优惠券视图（C 端，领取时快照券面信息，后续改券不影响已领） */
export interface UserCouponView {
  id: string;
  title: string;
  type: CouponType;
  value: number;
  thresholdFen: number;
  status: UserCouponStatus;
  /** 过期时间（快照领取时券的有效期结束） */
  expiresAt: string;
  /** 是否已过期（未使用且超过 expiresAt） */
  expired: boolean;
  createdAt: string;
}

/**
 * 按券面规则计算抵扣金额（分）。
 * 未达门槛返回 0；满减不超过订单金额；折扣按万分比向下取整让利给用户。
 */
export function calcCouponDeductionFen(
  type: CouponType,
  value: number,
  thresholdFen: number,
  amountFen: number,
): number {
  if (amountFen < thresholdFen) {
    return 0;
  }
  if (type === CouponType.Fixed) {
    return Math.min(Math.max(value, 0), amountFen);
  }
  if (value <= 0 || value >= FEE_RATE_BASE) {
    return 0;
  }
  return Math.floor((amountFen * (FEE_RATE_BASE - value)) / FEE_RATE_BASE);
}
