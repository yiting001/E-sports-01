import type {
  AdminOrderView,
  OrderStatus,
  PaginatedResult,
  ServiceAgentOption,
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
  /** 把「待客服处理」订单下发到接单大厅 */
  dispatch(id: string): Promise<AdminOrderView> {
    return http.post(`/order/admin/${id}/dispatch`);
  },
  /** 指派指定打手完成订单 */
  assign(id: string, boosterId: string): Promise<AdminOrderView> {
    return http.post(`/order/admin/${id}/assign`, { boosterId });
  },
  /** 分页查询可被指派的平台打手候选 */
  boosterCandidates(
    page: number,
    pageSize: number,
    keyword?: string,
  ): Promise<PaginatedResult<ServiceAgentOption>> {
    return http.get('/order/admin/booster-candidates', {
      params: { page, pageSize, keyword: keyword || undefined },
    });
  },
};
