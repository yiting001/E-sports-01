import {
  fenToYuan,
  type AdminOrderView,
  type OrderView,
} from '@app/contracts';
import type { OrderEntity } from '../domain/order.entity';

/** 订单实体 → C 端视图 */
export function toOrderView(entity: OrderEntity): OrderView {
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
    remark: entity.remark,
    remarkMedia: entity.remarkMedia ?? [],
    accountInfo: entity.accountInfo,
    createdAt: entity.createdAt.toISOString(),
    paidAt: entity.paidAt ? entity.paidAt.toISOString() : '',
    conversationId: entity.conversationId,
  };
}

/** 订单实体 → 接单大厅视图：未接单前对打手隐藏账号信息 */
export function toHallOrderView(entity: OrderEntity): OrderView {
  return { ...toOrderView(entity), accountInfo: '' };
}

/** 订单实体 → 管理端视图（补充归属用户/客服快照/渠道交易号） */
export function toAdminOrderView(entity: OrderEntity): AdminOrderView {
  return {
    ...toOrderView(entity),
    userId: entity.userId,
    serviceAgentId: entity.serviceAgentId,
    boosterId: entity.boosterId,
    providerTradeNo: entity.providerTradeNo ?? '',
  };
}
