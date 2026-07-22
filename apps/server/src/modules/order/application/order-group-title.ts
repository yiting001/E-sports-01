import { OrderStatus } from '@app/contracts';

/** 与 sys_conversation.title 列约束一致，避免状态前缀挤爆最长商品标题。 */
export const ORDER_GROUP_TITLE_MAX_LENGTH = 128;

const ORDER_GROUP_STAGE_TEXT: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.PendingService]: '待接单',
  [OrderStatus.Dispatching]: '待接单',
  [OrderStatus.Serving]: '服务中',
  [OrderStatus.Completed]: '已结束',
  [OrderStatus.RefundReviewing]: '退款审核',
  [OrderStatus.Refunded]: '已退款',
};

/** 订单状态是标题唯一事实来源；订单群不存在于待付款和已取消阶段。 */
export function buildOrderGroupTitle(productTitle: string, status: OrderStatus): string {
  const stage = ORDER_GROUP_STAGE_TEXT[status];
  if (!stage) {
    throw new Error(`订单状态 ${status} 不支持生成订单群标题`);
  }
  const prefix = `[${stage}] 订单群·`;
  const productLength = ORDER_GROUP_TITLE_MAX_LENGTH - Array.from(prefix).length;
  const normalizedProductTitle = Array.from(productTitle.trim()).slice(0, productLength).join('');
  return prefix + normalizedProductTitle;
}
