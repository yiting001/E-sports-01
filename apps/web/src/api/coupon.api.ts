import type {
  CouponView,
  PaginatedResult,
  UpsertCouponPayload,
} from '@app/contracts';
import { http } from './http';

/** 优惠券管理接口：券模板 CRUD */
export const couponApi = {
  /** 分页查询优惠券列表 */
  list(page: number, pageSize: number): Promise<PaginatedResult<CouponView>> {
    return http.get('/coupon/admin', { params: { page, pageSize } });
  },
  /** 新建优惠券 */
  create(payload: UpsertCouponPayload): Promise<CouponView> {
    return http.post('/coupon/admin', payload);
  },
  /** 编辑优惠券 */
  update(id: string, payload: UpsertCouponPayload): Promise<CouponView> {
    return http.put(`/coupon/admin/${id}`, payload);
  },
  /** 删除优惠券 */
  remove(id: string): Promise<void> {
    return http.delete(`/coupon/admin/${id}`);
  },
};
