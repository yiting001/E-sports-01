import type {
  CreateOrderPayload,
  CreateOrderResult,
  OrderStatus,
  OrderView,
  PaginatedResult,
  RequestOrderRefundPayload,
} from '@app/contracts';
import { http, type RequestOptions } from './http';

/** C 端订单接口：下单支付 + 我的订单查询/取消 */
export const orderApi = {
  /** 创建订单并按所选方式支付；支付宝/微信待支付时返回二维码内容 */
  create(payload: CreateOrderPayload): Promise<CreateOrderResult> {
    return http.post('/order', payload);
  },
  /** 单笔订单（支付结果轮询/详情用） */
  detail(id: string): Promise<OrderView> {
    return http.get(`/order/${id}`);
  },
  /** 主动查询支付结果（调渠道官方查单兜底，回调未达也能确认支付） */
  payQuery(id: string, options?: RequestOptions): Promise<OrderView> {
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
  requestRefund(id: string, payload: RequestOrderRefundPayload): Promise<OrderView> {
    return http.post(`/order/${id}/refund`, payload);
  },
  /** 接单大厅：分页浏览待接单订单（仅打手） */
  hall(
    page: number,
    pageSize: number,
    options: Pick<RequestOptions, 'silent'> = {},
  ): Promise<PaginatedResult<OrderView>> {
    return http.get('/order/hall', { ...options, params: { page, pageSize } });
  },
  /** 接单大厅：查看待接单订单详情（仅打手；账号信息接单前不可见） */
  hallDetail(id: string): Promise<OrderView> {
    return http.get(`/order/hall/${id}`);
  },
  /** 接单大厅：接单（仅打手） */
  accept(id: string): Promise<OrderView> {
    return http.post(`/order/hall/${id}/accept`);
  },
  /** 打手订单中心：分页查询我接下的订单（可按状态过滤） */
  boosterMine(
    page: number,
    pageSize: number,
    status?: OrderStatus,
  ): Promise<PaginatedResult<OrderView>> {
    return http.get('/order/booster/mine', { params: { page, pageSize, status } });
  },
  /** 打手订单中心：查看我接下的订单详情（接单后账号信息可见） */
  boosterDetail(id: string): Promise<OrderView> {
    return http.get(`/order/booster/mine/${id}`);
  },
  /** 打手完成服务中的订单 */
  complete(id: string): Promise<OrderView> {
    return http.post(`/order/booster/${id}/complete`);
  },
};
