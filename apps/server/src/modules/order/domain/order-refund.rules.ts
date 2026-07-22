import { OrderRefundStatus, OrderStatus } from '@app/contracts';

/** 本期仅允许已付款且尚未开始服务的订单申请全额退款。 */
export const REFUNDABLE_ORDER_STATUSES: readonly OrderStatus[] = [
  OrderStatus.PendingService,
  OrderStatus.Dispatching,
];

export function canRequestOrderRefund(
  status: OrderStatus,
): status is OrderStatus.PendingService | OrderStatus.Dispatching {
  return REFUNDABLE_ORDER_STATUSES.includes(status);
}

export function canApproveOrderRefund(status: OrderRefundStatus): boolean {
  return (
    status === OrderRefundStatus.PendingReview ||
    status === OrderRefundStatus.Processing ||
    status === OrderRefundStatus.Failed
  );
}

export function canRejectOrderRefund(status: OrderRefundStatus): boolean {
  return status === OrderRefundStatus.PendingReview;
}
