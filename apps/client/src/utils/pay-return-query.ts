import {
  OrderStatus,
  PayReturnKind,
  RechargeStatus,
  type OrderView,
  type RechargeStatusView,
} from '@app/contracts';
import { isOrderPaid } from './order-status';
import type { PayReturnParams } from './pay-return';

/** 支付回跳落地页的服务端查单结论 */
export type PayReturnQueryResult = 'paid' | 'pending' | 'closed';

/** 查单端口（便于单测注入；生产环境由 walletApi/orderApi 提供） */
export interface PayReturnQueryPorts {
  rechargeStatus(outTradeNo: string): Promise<RechargeStatusView>;
  orderPayQuery(orderId: string): Promise<OrderView>;
}

/**
 * 按回跳单据类型向服务端确认支付结果：
 * 充值以充值单状态为准，订单以订单支付状态为准；同步跳转参数本身不作为支付成功依据。
 */
export async function queryPayReturnResult(
  params: PayReturnParams,
  ports: PayReturnQueryPorts,
): Promise<PayReturnQueryResult> {
  if (params.kind === PayReturnKind.Recharge) {
    const { status } = await ports.rechargeStatus(params.ref);
    if (status === RechargeStatus.Paid) {
      return 'paid';
    }
    return status === RechargeStatus.Closed ? 'closed' : 'pending';
  }
  const order = await ports.orderPayQuery(params.ref);
  if (isOrderPaid(order)) {
    return 'paid';
  }
  return order.status === OrderStatus.Cancelled ? 'closed' : 'pending';
}
