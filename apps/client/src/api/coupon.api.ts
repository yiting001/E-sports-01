import type { CouponPublicView, UserCouponView } from '@app/contracts';
import { http } from './http';

/** 优惠券接口：领券中心 / 领取 / 我的优惠券 */
export const couponApi = {
  /** 领券中心：可领取的券列表 */
  center(): Promise<CouponPublicView[]> {
    return http.get('/coupon/center');
  },
  /** 领取一张券 */
  claim(couponId: string): Promise<UserCouponView> {
    return http.post(`/coupon/${couponId}/claim`);
  },
  /** 我的优惠券列表 */
  mine(): Promise<UserCouponView[]> {
    return http.get('/coupon/mine');
  },
};
