import type { OrderRefundEntity } from './order-refund.entity';
import type { OrderEntity } from './order.entity';

export interface OrderRefundBundle {
  order: OrderEntity;
  refund: OrderRefundEntity;
}

export interface RequestOrderRefundInput {
  tenantId: string;
  orderId: string;
  userId: string;
  refundNo: string;
  reason: string;
}

export type RequestOrderRefundResult =
  | ({ outcome: 'created' } & OrderRefundBundle)
  | { outcome: 'not_found' }
  | { outcome: 'invalid_status' }
  | { outcome: 'already_requested' };

export interface ReviewOrderRefundInput {
  tenantId: string;
  orderId: string;
  reviewerId: string;
  /** 新渠道尝试的候选号；处理中查询时事务会忽略该值。 */
  channelRefundNo: string;
}

export type BeginOrderRefundResult =
  | ({ outcome: 'started' } & OrderRefundBundle)
  | ({ outcome: 'retry_started' } & OrderRefundBundle)
  | ({ outcome: 'already_processing' } & OrderRefundBundle)
  | ({ outcome: 'already_succeeded' } & OrderRefundBundle)
  | { outcome: 'not_found' }
  | { outcome: 'invalid_status' };

export interface RejectOrderRefundInput {
  tenantId: string;
  orderId: string;
  reviewerId: string;
  reason: string;
}

export type RejectOrderRefundResult =
  | ({ outcome: 'rejected' } & OrderRefundBundle)
  | { outcome: 'not_found' }
  | { outcome: 'invalid_status' };

export interface CompleteOrderRefundInput {
  tenantId: string;
  refundId: string;
  channelRefundNo: string;
  providerRefundNo: string;
}

export type CompleteOrderRefundResult =
  | ({ outcome: 'completed' } & OrderRefundBundle)
  | ({ outcome: 'already_completed' } & OrderRefundBundle)
  | { outcome: 'not_found' }
  | { outcome: 'invalid_status' };

export interface FailOrderRefundInput {
  tenantId: string;
  refundId: string;
  channelRefundNo: string;
  providerRefundNo: string;
  reason: string;
}

export interface RecordOrderRefundChannelResultInput {
  tenantId: string;
  refundId: string;
  channelRefundNo: string;
  providerRefundNo: string;
}

export type RecordOrderRefundChannelResult =
  | ({ outcome: 'recorded' } & OrderRefundBundle)
  | { outcome: 'not_found' }
  | { outcome: 'invalid_status' };

export const ORDER_REFUND_TRANSACTION = Symbol('ORDER_REFUND_TRANSACTION');

/** 订单行与退款行采用固定锁序的事务端口。 */
export interface OrderRefundTransaction {
  request(input: RequestOrderRefundInput): Promise<RequestOrderRefundResult>;
  begin(input: ReviewOrderRefundInput): Promise<BeginOrderRefundResult>;
  reject(input: RejectOrderRefundInput): Promise<RejectOrderRefundResult>;
  recordChannelResult(
    input: RecordOrderRefundChannelResultInput,
  ): Promise<RecordOrderRefundChannelResult>;
  complete(input: CompleteOrderRefundInput): Promise<CompleteOrderRefundResult>;
  fail(input: FailOrderRefundInput): Promise<OrderRefundBundle | null>;
}
