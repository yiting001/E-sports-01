import type {
  CouponCodeView,
  CouponPublicView,
  CouponShareView,
  UserCouponView,
} from '@app/contracts';
import { http } from './http';

/** 优惠券接口：领券中心 / 领取 / 我的优惠券 / 推广发券（分发链接） */
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
  /** 我的推广券（分发人可发放的券与进度） */
  shareMine(): Promise<CouponShareView[]> {
    return http.get('/coupon/share/mine');
  },
  /** 按分发码查看券信息（分发链接落地页） */
  byCode(code: string): Promise<CouponCodeView> {
    return http.get(`/coupon/code/${code}`);
  },
  /** 按分发码领取（归因到分发人） */
  claimByCode(code: string): Promise<UserCouponView> {
    return http.post(`/coupon/code/${code}/claim`);
  },
};
