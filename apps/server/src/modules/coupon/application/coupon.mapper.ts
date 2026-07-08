import type {
  CouponCodeView,
  CouponPublicView,
  CouponShareView,
  CouponView,
  UserCouponView,
} from '@app/contracts';
import type { CouponEntity } from '../domain/coupon.entity';
import type { UserCouponEntity } from '../domain/user-coupon.entity';

/** 实体 → 管理端视图 */
export function toCouponView(entity: CouponEntity): CouponView {
  return {
    id: entity.id,
    title: entity.title,
    type: entity.type,
    value: entity.value,
    thresholdFen: entity.thresholdFen,
    totalCount: entity.totalCount,
    issuedCount: entity.issuedCount,
    perUserLimit: entity.perUserLimit,
    validFrom: entity.validFrom.toISOString(),
    validTo: entity.validTo.toISOString(),
    enabled: entity.enabled,
    audience: entity.audience,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}

/** 实体 → 领券中心视图（补充剩余量与我已领张数） */
export function toCouponPublicView(
  entity: CouponEntity,
  claimedByMe: number,
): CouponPublicView {
  return {
    id: entity.id,
    title: entity.title,
    type: entity.type,
    value: entity.value,
    thresholdFen: entity.thresholdFen,
    validFrom: entity.validFrom.toISOString(),
    validTo: entity.validTo.toISOString(),
    remaining: Math.max(entity.totalCount - entity.issuedCount, 0),
    claimedByMe,
    perUserLimit: entity.perUserLimit,
  };
}

/** 实体 → 分发链接落地页视图（公开视图 + 分发码） */
export function toCouponCodeView(
  entity: CouponEntity,
  claimedByMe: number,
  code: string,
): CouponCodeView {
  return { ...toCouponPublicView(entity, claimedByMe), code };
}

/** 实体 → 我的推广券视图（分发人侧：券面 + 分发码 + 发放进度） */
export function toCouponShareView(
  entity: CouponEntity,
  code: string,
  claimedCount: number,
): CouponShareView {
  return {
    couponId: entity.id,
    title: entity.title,
    type: entity.type,
    value: entity.value,
    thresholdFen: entity.thresholdFen,
    validFrom: entity.validFrom.toISOString(),
    validTo: entity.validTo.toISOString(),
    enabled: entity.enabled,
    code,
    claimedCount,
    remaining: Math.max(entity.totalCount - entity.issuedCount, 0),
  };
}

/** 用户券实体 → 我的券视图 */
export function toUserCouponView(
  entity: UserCouponEntity,
  now: Date,
): UserCouponView {
  return {
    id: entity.id,
    title: entity.title,
    type: entity.type,
    value: entity.value,
    thresholdFen: entity.thresholdFen,
    status: entity.status,
    expiresAt: entity.expiresAt.toISOString(),
    expired: entity.expiresAt.getTime() <= now.getTime(),
    createdAt: entity.createdAt.toISOString(),
  };
}
