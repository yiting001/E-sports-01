import {
  FeedbackType,
  OrderStatus,
  type OrderView,
  type PaginatedResult,
  type SubmitFeedbackPayload,
} from '@app/contracts';

export type FeedbackOrderSource = Pick<
  OrderView,
  'id' | 'orderNo' | 'status' | 'boosterId' | 'boosterName'
>;

export interface FeedbackOrderOption {
  id: string;
  orderNo: string;
  status: OrderStatus.Serving | OrderStatus.Completed;
  boosterUserId: string;
  boosterName: string;
}

export type FeedbackOrderPageLoader = (
  page: number,
  pageSize: number,
  status: OrderStatus,
) => Promise<PaginatedResult<FeedbackOrderSource>>;

const COMPLAINT_ORDER_STATUSES = [OrderStatus.Serving, OrderStatus.Completed] as const;

/** 只暴露已产生实际履约关系的订单，并防止状态切换期间出现重复选项。 */
export function selectFeedbackOrderOptions(
  orders: readonly FeedbackOrderSource[],
): FeedbackOrderOption[] {
  const seenOrderIds = new Set<string>();
  const options: FeedbackOrderOption[] = [];

  for (const order of orders) {
    if (order.status !== OrderStatus.Serving && order.status !== OrderStatus.Completed) {
      continue;
    }

    const boosterUserId = order.boosterId.trim();
    const boosterName = order.boosterName.trim();
    if (!boosterUserId || !boosterName || seenOrderIds.has(order.id)) {
      continue;
    }

    seenOrderIds.add(order.id);
    options.push({
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      boosterUserId,
      boosterName,
    });
  }

  return options;
}

async function loadOrdersByStatus(
  loadPage: FeedbackOrderPageLoader,
  status: OrderStatus.Serving | OrderStatus.Completed,
  pageSize: number,
): Promise<FeedbackOrderSource[]> {
  const orders: FeedbackOrderSource[] = [];
  let page = 1;
  let total = 0;

  do {
    const result = await loadPage(page, pageSize, status);
    orders.push(...result.list);
    total = result.total;
    page += 1;

    if (result.list.length === 0) {
      break;
    }
  } while (orders.length < total);

  return orders;
}

/** 分状态加载全部可投诉订单，避免默认分页遗漏较早的履约订单。 */
export async function loadFeedbackOrderOptions(
  loadPage: FeedbackOrderPageLoader,
  pageSize: number,
): Promise<FeedbackOrderOption[]> {
  const groups = await Promise.all(
    COMPLAINT_ORDER_STATUSES.map((status) => loadOrdersByStatus(loadPage, status, pageSize)),
  );

  return selectFeedbackOrderOptions(groups.flat());
}

/** 构造与反馈类型互斥约束一致的请求载荷。 */
export function buildSubmitFeedbackPayload(
  type: FeedbackType,
  selectedOrderId: string,
  target: string,
  content: string,
): SubmitFeedbackPayload {
  if (type === FeedbackType.Booster) {
    return {
      type,
      orderId: selectedOrderId.trim(),
      content,
    };
  }

  const normalizedTarget = target.trim();
  return {
    type,
    ...(normalizedTarget ? { target: normalizedTarget } : {}),
    content,
  };
}
