import type {
  CreateOrderPayload,
  CreateOrderResult,
  OrderStatus,
  OrderView,
  PaginatedResult,
  RequestOrderRefundPayload,
} from '@app/contracts';
import { http } from './http';

/** C 端订单接口：下单支付 + 我的订单查询/取消/退款 */
export const orderApi = {
  /** 创建订单并按所选方式支付；余额/0 元单直接完成，渠道支付返回拉起参数或二维码 */
  create(payload: CreateOrderPayload): Promise<CreateOrderResult> {
    return http.post('/order', payload);
  },

  /** 单笔订单（支付结果轮询/详情用） */
  detail(id: string): Promise<OrderView> {
    return http.get(`/order/${id}`);
  },

  /** 主动查询支付结果（调渠道官方查单兜底，回调未达也能确认支付） */
  payQuery(id: string, options = { silent: true }): Promise<OrderView> {
    return http.get(`/order/${id}/pay/query`, options);
  },

  /** 分页查询我的订单（可按状态过滤） */
  mine(
    page: number,
    pageSize: number,
    status?: OrderStatus,
  ): Promise<PaginatedResult<OrderView>> {
    return http.get('/order/mine', { params: { page, pageSize, status } });
  },

  /** 取消待付款订单 */
  cancel(id: string): Promise<OrderView> {
    return http.post(`/order/${id}/cancel`);
  },

  /** 申请全额原路退款，进入后台审核流程 */
  requestRefund(
    id: string,
    payload: RequestOrderRefundPayload,
  ): Promise<OrderView> {
    return http.post(`/order/${id}/refund`, payload);
  },
};
