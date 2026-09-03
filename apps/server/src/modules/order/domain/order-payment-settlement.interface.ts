import type { OrderPaymentMethod } from '@app/contracts';
import type { OrderEntity } from './order.entity';

/** 支付渠道或 0 元订单落账入参 */
export interface SettleOrderPaymentInput {
  orderNo: string;
  method: OrderPaymentMethod;
  providerTradeNo: string;
  paidAmountFen: number;
  /** 渠道手续费（分），渠道未回传时为空 */
  channelFeeFen?: number | null;
}

/** 钱包余额支付入参 */
export interface SettleBalancePaymentInput {
  orderId: string;
  userId: string;
  paidAmountFen: number;
}

export const ORDER_PAYMENT_SETTLEMENT = Symbol('ORDER_PAYMENT_SETTLEMENT');

/**
 * 订单支付事务端口。
 * 返回实体表示本次事务首次完成订单、资金、销量与会员累计落账；
 * 返回 null 表示订单已由并发请求完成，调用方仅补偿建群等提交后副作用。
 */
export interface OrderPaymentSettlement {
  settle(input: SettleOrderPaymentInput): Promise<OrderEntity | null>;
  settleBalance(input: SettleBalancePaymentInput): Promise<OrderEntity | null>;
}
