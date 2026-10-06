import type { UserCouponView } from '@app/contracts';
import { http } from './http';

/** C 端优惠券接口：我的优惠券列表（下单选择抵扣用） */
export const couponApi = {
  /** 我领取的优惠券（含已使用/已过期状态，由调用方过滤可用） */
  mine(): Promise<UserCouponView[]> {
    return http.get('/coupon/mine', { silent: true });
  },
};
