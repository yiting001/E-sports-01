import { OrderRefundStatus } from "@app/contracts";

export type RefundPrimaryAction = "approve" | "query" | "retry";
export type RefundSubmissionAction = "advance" | "reject";
export type RefundTagType = "warning" | "info" | "success" | "danger";

export interface RefundPrimaryActionMeta {
  action: RefundPrimaryAction;
  label: string;
}

/** 待审核、渠道处理中和失败重试共用 approve 幂等端点，但交互文案不同。 */
export function refundPrimaryAction(
  status: OrderRefundStatus
): RefundPrimaryActionMeta | null {
  switch (status) {
    case OrderRefundStatus.PendingReview:
      return { action: "approve", label: "同意退款" };
    case OrderRefundStatus.Processing:
      return { action: "query", label: "查询退款" };
    case OrderRefundStatus.Failed:
      return { action: "retry", label: "重试退款" };
    case OrderRefundStatus.Succeeded:
    case OrderRefundStatus.Rejected:
      return null;
  }
}

/** 退款操作行必须同时满足状态可推进与当前账号拥有审核权限。 */
export function canShowRefundReviewAction(
  status: OrderRefundStatus,
  hasReviewPermission: boolean
): boolean {
  return hasReviewPermission && refundPrimaryAction(status) !== null;
}

export function refundTagType(status: OrderRefundStatus): RefundTagType {
  switch (status) {
    case OrderRefundStatus.PendingReview:
      return "warning";
    case OrderRefundStatus.Processing:
      return "info";
    case OrderRefundStatus.Succeeded:
      return "success";
    case OrderRefundStatus.Rejected:
    case OrderRefundStatus.Failed:
      return "danger";
  }
}
