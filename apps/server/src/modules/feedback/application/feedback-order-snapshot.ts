import { FeedbackType, OrderStatus } from '@app/contracts';

interface FeedbackOrderCandidate {
  id: string;
  orderNo: string;
  userId: string;
  boosterId: string;
  boosterName: string;
  status: OrderStatus;
}

export interface FeedbackOrderSnapshot {
  orderId: string;
  orderNo: string;
  boosterUserId: string;
  boosterName: string;
  target: string;
}

interface ResolveFeedbackOrderSnapshotInput {
  userId: string;
  type: FeedbackType;
  orderId?: string;
  order: FeedbackOrderCandidate | null;
}

export enum FeedbackOrderSnapshotErrorCode {
  OrderNotAllowed = 'order_not_allowed',
  OrderRequired = 'order_required',
  OrderNotFound = 'order_not_found',
  BoosterUnavailable = 'booster_unavailable',
}

/** 应用规则错误，由协议层映射为对应 HTTP 状态。 */
export class FeedbackOrderSnapshotError extends Error {
  constructor(readonly code: FeedbackOrderSnapshotErrorCode, message: string) {
    super(message);
    this.name = 'FeedbackOrderSnapshotError';
  }
}

const COMPLAINT_ORDER_STATUSES = new Set([OrderStatus.Serving, OrderStatus.Completed]);

/** 从本人真实履约订单生成不可由客户端伪造的投诉关联快照。 */
export function resolveFeedbackOrderSnapshot(
  input: ResolveFeedbackOrderSnapshotInput,
): FeedbackOrderSnapshot | null {
  if (input.type !== FeedbackType.Booster) {
    if (input.orderId) {
      throw new FeedbackOrderSnapshotError(
        FeedbackOrderSnapshotErrorCode.OrderNotAllowed,
        '仅投诉打手可以关联订单',
      );
    }
    return null;
  }
  if (!input.orderId) {
    throw new FeedbackOrderSnapshotError(
      FeedbackOrderSnapshotErrorCode.OrderRequired,
      '投诉打手必须选择关联订单',
    );
  }
  if (!input.order) {
    throw new FeedbackOrderSnapshotError(
      FeedbackOrderSnapshotErrorCode.OrderNotFound,
      '关联订单不存在',
    );
  }
  if (input.order.userId !== input.userId) {
    throw new FeedbackOrderSnapshotError(
      FeedbackOrderSnapshotErrorCode.OrderNotFound,
      '关联订单不存在',
    );
  }
  if (
    !input.order.boosterId ||
    !input.order.boosterName ||
    !COMPLAINT_ORDER_STATUSES.has(input.order.status)
  ) {
    throw new FeedbackOrderSnapshotError(
      FeedbackOrderSnapshotErrorCode.BoosterUnavailable,
      '订单尚未产生实际接单打手',
    );
  }
  return {
    orderId: input.order.id,
    orderNo: input.order.orderNo,
    boosterUserId: input.order.boosterId,
    boosterName: input.order.boosterName,
    target: input.order.orderNo,
  };
}
