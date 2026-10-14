import type {
  CreateOrderPayload,
  CreateOrderResult,
  MyOrderPage,
  OrderStatus,
  OrderView,
} from '@/types/order';
import { http } from './http';

/**
 * C 端订单接口：下单支付 + 我的订单查询/取消。
 * 余额支付在创建时即完成；渠道支付（支付宝/微信）依赖服务端支付渠道，小程序端暂未开通。
 */
export const orderApi = {
  /** 创建订单并按所选方式支付 */
  create(payload: CreateOrderPayload): Promise<CreateOrderResult> {
    return http.post('/order', payload);
  },

  /** 分页查询我的订单（可按状态过滤） */
  mine(page: number, pageSize: number, status?: OrderStatus): Promise<MyOrderPage> {
    return http.get('/order/mine', { params: { page, pageSize, status } });
  },

  /** 单笔订单（支付结果查询/详情用） */
  detail(id: string): Promise<OrderView> {
    return http.get(`/order/${id}`, { silent: true });
  },

  /** 取消待付款订单 */
  cancel(id: string): Promise<OrderView> {
    return http.post(`/order/${id}/cancel`);
  },
};
