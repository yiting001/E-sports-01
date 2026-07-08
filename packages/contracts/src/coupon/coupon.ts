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

/** 发放方式 */
export enum CouponAudience {
  /** 公开领取：领券中心对所有用户展示 */
  Public = 'public',
  /** 定向发放：不进领券中心，由指定分发人（客服/打手）通过专属链接发放引流 */
  Directed = 'directed',
}

/** 优惠券字段约束（DTO 校验与前端输入限制共享） */
export const COUPON_LIMITS = {
  /** 券名最大长度 */
  titleMax: 32,
  /** 单券库存上限 */
  totalCountMax: 1000000,
  /** 单用户限领上限 */
  perUserLimitMax: 100,
  /** 分发码长度（分发人专属领取链接） */
  shareCodeLength: 10,
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
  /** 发放方式：公开领取 / 定向发放 */
  audience: CouponAudience;
}

/** 添加分发人入参（管理端，定向券指派客服/打手） */
export interface AddCouponDistributorPayload {
  /** 分发人用户 id */
  userId: string;
}

/** 分发人视图（管理端） */
export interface CouponDistributorView {
  id: string;
  /** 分发人用户 id */
  userId: string;
  /** 分发人用户名 */
  username: string;
  /** 分发人昵称 */
  nickname: string;
  /** 分发码（拼接 C 端领取链接） */
  code: string;
  /** 经该分发人发放（被领取）的张数 */
  claimedCount: number;
  createdAt: string;
}

/** 领取记录视图（管理端，记录哪个用户领了、经哪个分发人） */
export interface CouponClaimRecordView {
  id: string;
  /** 领取人用户 id */
  userId: string;
  /** 领取人用户名 */
  username: string;
  /** 领取人昵称 */
  nickname: string;
  /** 分发人用户 id（领券中心自领为 null） */
  distributorUserId: string | null;
  /** 分发人昵称（领券中心自领为 null） */
  distributorName: string | null;
  /** 领取时间 */
  createdAt: string;
}

/** 我的推广券视图（C 端，分发人查看自己可发放的券与发放进度） */
export interface CouponShareView {
  couponId: string;
  title: string;
  type: CouponType;
  value: number;
  thresholdFen: number;
  validFrom: string;
  validTo: string;
  /** 券是否上架 */
  enabled: boolean;
  /** 我的分发码（拼接领取链接） */
  code: string;
  /** 经我发放（被领取）的张数 */
  claimedCount: number;
  /** 券剩余可领张数 */
  remaining: number;
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

/** 分发链接落地页视图（C 端按分发码查看并领取定向券） */
export interface CouponCodeView extends CouponPublicView {
  /** 分发码 */
  code: string;
}

/** 分发人候选用户（管理端选择器用，任意注册用户可指派） */
export interface CouponDistributorCandidate {
  id: string;
  username: string;
  nickname: string;
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
