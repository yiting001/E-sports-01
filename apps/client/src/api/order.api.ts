import type {
  CreateOrderPayload,
  CreateOrderResult,
  OrderStatus,
  OrderView,
  PaginatedResult,
} from '@app/contracts';
import { http } from './http';

/** C 端订单接口：下单支付 + 我的订单查询/取消 */
export const orderApi = {
  /** 创建订单并发起扫码支付，返回二维码内容 */
  create(payload: CreateOrderPayload): Promise<CreateOrderResult> {
    return http.post('/order', payload);
  },
  /** 单笔订单（支付结果轮询/详情用） */
  detail(id: string): Promise<OrderView> {
    return http.get(`/order/${id}`);
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
  /** 接单大厅：分页浏览待接单订单（仅打手） */
  hall(page: number, pageSize: number): Promise<PaginatedResult<OrderView>> {
    return http.get('/order/hall', { params: { page, pageSize } });
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
  /** 打手完成服务中的订单 */
  complete(id: string): Promise<OrderView> {
    return http.post(`/order/booster/${id}/complete`);
  },
};
