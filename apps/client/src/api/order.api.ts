import type {
  CreateOrderPayload,
  CreateOrderResult,
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
  /** 分页查询我的订单 */
  mine(page: number, pageSize: number): Promise<PaginatedResult<OrderView>> {
    return http.get('/order/mine', { params: { page, pageSize } });
  },
  /** 取消待付款订单 */
  cancel(id: string): Promise<OrderView> {
    return http.post(`/order/${id}/cancel`);
  },
};
