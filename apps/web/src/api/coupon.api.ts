import type {
  CouponClaimRecordView,
  CouponDistributorCandidate,
  CouponDistributorView,
  CouponView,
  PaginatedResult,
  UpsertCouponPayload,
} from '@app/contracts';
import { http } from './http';

/** 优惠券管理接口：券模板 CRUD + 定向发放（分发人/领取记录） */
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
  /** 某券的分发人列表 */
  distributors(id: string): Promise<CouponDistributorView[]> {
    return http.get(`/coupon/admin/${id}/distributors`);
  },
  /** 为某券添加分发人 */
  addDistributor(id: string, userId: string): Promise<CouponDistributorView> {
    return http.post(`/coupon/admin/${id}/distributors`, { userId });
  },
  /** 移除某券的分发人 */
  removeDistributor(id: string, distributorId: string): Promise<void> {
    return http.delete(`/coupon/admin/${id}/distributors/${distributorId}`);
  },
  /** 某券的领取记录分页 */
  claims(
    id: string,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<CouponClaimRecordView>> {
    return http.get(`/coupon/admin/${id}/claims`, {
      params: { page, pageSize },
    });
  },
  /** 分发人候选用户（按用户名/昵称搜索） */
  distributorCandidates(
    keyword: string,
  ): Promise<PaginatedResult<CouponDistributorCandidate>> {
    return http.get('/coupon/admin/distributor-candidates', {
      params: { page: 1, pageSize: 20, keyword },
    });
  },
};
