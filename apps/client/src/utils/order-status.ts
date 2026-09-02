import {
  OrderRefundStatus,
  OrderStatus,
  type OrderView,
} from "@app/contracts";

export type ClientStatusTone = "accent" | "success" | "danger" | "muted";

const ORDER_DATE_TIME_FORMATTER = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/** 将服务端 ISO 时间按浏览器本地时区展示，避免把 UTC 文本直接当作本地时间。 */
export function formatOrderDateTime(iso: string): string {
  if (!iso) {
    return "-";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return ORDER_DATE_TIME_FORMATTER.format(date).replaceAll("/", "-");
}

const PAID_ORDER_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  OrderStatus.PendingService,
  OrderStatus.Dispatching,
  OrderStatus.Serving,
  OrderStatus.Completed,
]);

/** 订单是否已完成支付（以支付时间或已进入付款后状态为准）。 */
export function isOrderPaid(order: OrderView): boolean {
  return Boolean(order.paidAt) || PAID_ORDER_STATUSES.has(order.status);
}

/** 订单主状态视觉语义，确保新增终态不会误显示为“进行中”。 */
export function orderStatusTone(status: OrderStatus): ClientStatusTone {
  if (status === OrderStatus.Cancelled) {
    return "muted";
  }
  if (status === OrderStatus.Completed || status === OrderStatus.Refunded) {
    return "success";
  }
  return "accent";
}

/** 退款副状态视觉语义：处理中、成功与失败分组统一。 */
export function orderRefundStatusTone(
  status: OrderRefundStatus
): ClientStatusTone {
  if (status === OrderRefundStatus.Succeeded) {
    return "success";
  }
  if (
    status === OrderRefundStatus.Rejected ||
    status === OrderRefundStatus.Failed
  ) {
    return "danger";
  }
  return "accent";
}
