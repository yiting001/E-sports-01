import { fenToYuan, type OrderView } from '@app/contracts';
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
    provider: entity.provider,
    status: entity.status,
    remark: entity.remark,
    createdAt: entity.createdAt.toISOString(),
    paidAt: entity.paidAt ? entity.paidAt.toISOString() : '',
  };
}
