import type { CouponEntity } from './coupon.entity';
import type { UserCouponEntity } from './user-coupon.entity';

/** 优惠券仓储注入令牌 */
export const COUPON_REPOSITORY = Symbol('COUPON_REPOSITORY');

/** 优惠券仓储端口（券模板 + 用户券，领域层只依赖此抽象） */
export interface CouponRepository {
  findById(id: string): Promise<CouponEntity | null>;
  /** 管理端分页（创建时间倒序） */
  paginate(skip: number, take: number): Promise<[CouponEntity[], number]>;
  /** 领券中心：上架且在有效期内的券（有效期结束升序） */
  findClaimable(now: Date): Promise<CouponEntity[]>;
  create(data: Partial<CouponEntity>): CouponEntity;
  save(entity: CouponEntity): Promise<CouponEntity>;
  remove(entity: CouponEntity): Promise<void>;

  /** 条件自增已领数（issuedCount < totalCount 才生效），返回是否领取成功，杜绝超发 */
  tryIncrementIssued(couponId: string): Promise<boolean>;
  /** 回滚一次已领数（领取落库失败时补偿） */
  decrementIssued(couponId: string): Promise<void>;

  /** 用户在某券下的已领张数 */
  countClaimed(userId: string, couponId: string): Promise<number>;
  /** 用户在一批券下的已领张数（couponId → 张数） */
  countClaimedBatch(
    userId: string,
    couponIds: string[],
  ): Promise<Map<string, number>>;
  /** 我的券列表（创建时间倒序） */
  findByUser(userId: string): Promise<UserCouponEntity[]>;
  findUserCouponById(id: string): Promise<UserCouponEntity | null>;
  createUserCoupon(data: Partial<UserCouponEntity>): UserCouponEntity;
  saveUserCoupon(entity: UserCouponEntity): Promise<UserCouponEntity>;

  /** 条件核销：未使用 → 已使用并回填订单号，返回是否成功（并发安全） */
  markUsed(userCouponId: string, orderId: string): Promise<boolean>;
  /** 取消订单回退：该订单核销的券恢复未使用 */
  restoreByOrder(orderId: string): Promise<void>;
}
