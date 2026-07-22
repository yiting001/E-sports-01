import type {
  AdminOrderView,
  OrderGroupJoinResult,
  RejectOrderRefundPayload,
  OrderStatus,
  PaginatedResult,
  ServiceAgentOption,
} from "@app/contracts";
import { http, type RequestOptions } from "./http";

/** 订单管理接口：管理端检索订单列表 + 查看单笔详情 */
export const orderApi = {
  /** 分页检索订单，可按状态/订单号过滤 */
  list(
    page: number,
    pageSize: number,
    status?: OrderStatus,
    orderNo?: string,
    options: RequestOptions = {}
  ): Promise<PaginatedResult<AdminOrderView>> {
    return http.get("/order/admin", {
      params: { page, pageSize, status, orderNo: orderNo || undefined },
      ...options,
    });
  },
  /** 查询单笔订单详情 */
  detail(id: string): Promise<AdminOrderView> {
    return http.get(`/order/admin/${id}`);
  },
  /** 幂等加入订单群，返回群会话 id（后台打开群聊入口） */
  joinGroup(id: string): Promise<OrderGroupJoinResult> {
    return http.post(`/order/admin/${id}/group/join`);
  },
  /** 把「待客服处理」订单下发到接单大厅 */
  dispatch(id: string): Promise<AdminOrderView> {
    return http.post(`/order/admin/${id}/dispatch`);
  },
  /** 指派指定打手完成订单 */
  assign(id: string, boosterId: string): Promise<AdminOrderView> {
    return http.post(`/order/admin/${id}/assign`, { boosterId });
  },
  /** 同意退款；处理中时查询渠道，失败时以同一退款号重试 */
  approveRefund(id: string): Promise<AdminOrderView> {
    return http.post(`/order/admin/${id}/refund/approve`);
  },
  /** 驳回待审核退款并记录原因 */
  rejectRefund(
    id: string,
    payload: RejectOrderRefundPayload
  ): Promise<AdminOrderView> {
    return http.post(`/order/admin/${id}/refund/reject`, payload);
  },
  /** 分页查询可被指派的平台打手候选 */
  boosterCandidates(
    page: number,
    pageSize: number,
    keyword?: string
  ): Promise<PaginatedResult<ServiceAgentOption>> {
    return http.get("/order/admin/booster-candidates", {
      params: { page, pageSize, keyword: keyword || undefined },
    });
  },
};
