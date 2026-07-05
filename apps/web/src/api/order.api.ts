import type {
  AdminOrderView,
  OrderStatus,
  PaginatedResult,
} from '@app/contracts';
import { http } from './http';

/** 订单管理接口：管理端检索订单列表 + 查看单笔详情 */
export const orderApi = {
  /** 分页检索订单，可按状态/订单号过滤 */
  list(
    page: number,
    pageSize: number,
    status?: OrderStatus,
    orderNo?: string,
  ): Promise<PaginatedResult<AdminOrderView>> {
    return http.get('/order/admin', {
      params: { page, pageSize, status, orderNo: orderNo || undefined },
    });
  },
  /** 查询单笔订单详情 */
  detail(id: string): Promise<AdminOrderView> {
    return http.get(`/order/admin/${id}`);
  },
};
