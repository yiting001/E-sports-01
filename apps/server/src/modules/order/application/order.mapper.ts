import {
  fenToYuan,
  type AdminOrderRefundView,
  type AdminOrderView,
  type OrderRefundView,
  type OrderView,
} from '@app/contracts';
import type { OrderRefundEntity } from '../domain/order-refund.entity';
import { canRequestOrderRefund } from '../domain/order-refund.rules';
import type { OrderEntity } from '../domain/order.entity';

/** 可空时间 → ISO 字符串（未发生为空串） */
function toIso(date: Date | null): string {
  return date ? date.toISOString() : '';
}

export function toOrderRefundView(
  entity: OrderRefundEntity | null | undefined,
): OrderRefundView | null {
  if (!entity) {
    return null;
  }
  return {
    status: entity.status,
    amountFen: entity.amountFen,
    amountYuan: fenToYuan(entity.amountFen),
    paymentMethod: entity.paymentMethod,
    reason: entity.reason,
    rejectReason: entity.rejectReason,
    failReason: entity.failReason,
    requestedAt: entity.createdAt.toISOString(),
    reviewedAt: toIso(entity.reviewedAt),
    refundedAt: toIso(entity.refundedAt),
  };
}

function toAdminOrderRefundView(
  entity: OrderRefundEntity | null | undefined,
): AdminOrderRefundView | null {
  const refund = toOrderRefundView(entity);
  if (!entity || !refund) {
    return null;
  }
  return {
    ...refund,
    id: entity.id,
    refundNo: entity.refundNo,
    reviewerId: entity.reviewerId,
  };
}

/** 订单实体 → 订单本人视图 */
export function toOwnerOrderView(entity: OrderEntity): OrderView {
  return {
    id: entity.id,
    orderNo: entity.orderNo,
    productId: entity.productId,
    productTitle: entity.productTitle,
    productCover: entity.productCover,
    quantity: entity.quantity,
    amountFen: entity.amountFen,
    amountYuan: fenToYuan(entity.amountFen),
    originalAmountFen: entity.originalAmountFen,
    discountBp: entity.discountBp,
    couponDeductionFen: entity.couponDeductionFen,
    commissionFen: entity.commissionFen,
    commissionRateBp: entity.commissionRateBp,
    provider: entity.provider,
    status: entity.status,
    canRequestRefund: !entity.refund && canRequestOrderRefund(entity.status),
    refund: toOrderRefundView(entity.refund),
    remark: entity.remark,
    remarkMedia: entity.remarkMedia ?? [],
    accountInfo: entity.accountInfo,
    boosterId: entity.boosterId,
    boosterName: entity.boosterName,
    gameAccountId: entity.gameAccountId,
    gameTextId: entity.gameTextId,
    serviceRegion: entity.serviceRegion,
    boosterSelectionMode: entity.boosterSelectionMode,
    requestedBoosterId: entity.requestedBoosterId,
    requestedBoosterName: entity.requestedBoosterName,
    createdAt: entity.createdAt.toISOString(),
    paidAt: toIso(entity.paidAt),
    dispatchedAt: toIso(entity.dispatchedAt),
    acceptedAt: toIso(entity.acceptedAt),
    completedAt: toIso(entity.completedAt),
    cancelledAt: toIso(entity.cancelledAt),
    conversationId: entity.conversationId,
  };
}

/** 订单实体 → 已接单打手视图：保留履约资料，隐藏订单本人的退款信息。 */
export function toBoosterOrderView(entity: OrderEntity): OrderView {
  return {
    ...toOwnerOrderView(entity),
    canRequestRefund: false,
    refund: null,
  };
}

/** 订单实体 → 接单大厅视图：隐藏履约账号和订单本人的退款信息。 */
export function toHallOrderView(entity: OrderEntity): OrderView {
  return {
    ...toBoosterOrderView(entity),
    accountInfo: '',
    gameAccountId: '',
    gameTextId: '',
  };
}

/** 订单实体 → 管理端视图（补充归属用户/客服快照/渠道交易号） */
export function toAdminOrderView(entity: OrderEntity): AdminOrderView {
  return {
    ...toOwnerOrderView(entity),
    refund: toAdminOrderRefundView(entity.refund),
    userId: entity.userId,
    serviceAgentId: entity.serviceAgentId,
    providerTradeNo: entity.providerTradeNo ?? '',
  };
}
