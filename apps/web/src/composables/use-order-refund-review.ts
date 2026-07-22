import { reactive } from "vue";
import {
  ORDER_REFUND_LIMITS,
  OrderRefundStatus,
  type AdminOrderView,
} from "@app/contracts";
import { ElMessage, ElMessageBox } from "element-plus";
import { orderApi } from "@/api/order.api";
import {
  refundPrimaryAction,
  type RefundSubmissionAction,
} from "@/utils/order-refund-ui";

interface OrderRefundReviewOptions {
  onUpdated: (order: AdminOrderView) => void;
  refresh: () => Promise<void>;
}

function isMessageBoxCancellation(error: unknown): boolean {
  return error === "cancel" || error === "close";
}

/** 管理端退款审核交互：确认、幂等推进、结果反馈与单飞保护。 */
export function useOrderRefundReview(options: OrderRefundReviewOptions) {
  const submitting = reactive(new Map<string, RefundSubmissionAction>());

  function submittingAction(
    orderId: string
  ): RefundSubmissionAction | undefined {
    return submitting.get(orderId);
  }

  function notifyResult(updated: AdminOrderView): void {
    const refund = updated.refund;
    if (!refund) {
      ElMessage.error("退款状态缺失，请刷新后重试");
      return;
    }
    switch (refund.status) {
      case OrderRefundStatus.Succeeded:
        ElMessage.success("退款已原路退回");
        return;
      case OrderRefundStatus.Processing:
        ElMessage.info("退款渠道处理中，可稍后再次查询");
        return;
      case OrderRefundStatus.Failed:
        ElMessage.error(refund.failReason || "退款失败，可稍后重试");
        return;
      case OrderRefundStatus.Rejected:
        ElMessage.warning("退款申请已驳回");
        return;
      case OrderRefundStatus.PendingReview:
        ElMessage.info("退款申请仍待审核");
    }
  }

  async function advance(row: AdminOrderView): Promise<void> {
    const refund = row.refund;
    const primary = refund ? refundPrimaryAction(refund.status) : null;
    if (!refund || !primary || submitting.has(row.id)) {
      return;
    }
    submitting.set(row.id, "advance");
    try {
      if (primary.action === "approve") {
        await ElMessageBox.confirm(
          `确认同意订单 ${row.orderNo} 的全额退款 ¥${refund.amountYuan}？同意后将按原支付方式退款。`,
          "同意退款",
          { type: "warning" }
        );
      } else if (primary.action === "retry") {
        await ElMessageBox.confirm(
          `确认重试订单 ${row.orderNo} 的退款？将沿用原退款单号，避免重复退款。`,
          "重试退款",
          { type: "warning" }
        );
      }
      const updated = await orderApi.approveRefund(row.id);
      options.onUpdated(updated);
      notifyResult(updated);
      await options.refresh();
    } catch (error: unknown) {
      if (!isMessageBoxCancellation(error)) {
        throw error;
      }
    } finally {
      submitting.delete(row.id);
    }
  }

  async function reject(row: AdminOrderView): Promise<void> {
    if (
      submitting.has(row.id) ||
      row.refund?.status !== OrderRefundStatus.PendingReview
    ) {
      return;
    }
    submitting.set(row.id, "reject");
    try {
      const { value } = await ElMessageBox.prompt(
        `请输入驳回订单 ${row.orderNo} 退款申请的理由`,
        "驳回退款",
        {
          inputType: "textarea",
          inputValidator: (input: string) => {
            const reason = input.trim();
            if (!reason) {
              return "驳回理由不能为空";
            }
            return reason.length <= ORDER_REFUND_LIMITS.reviewReasonMax
              ? true
              : `驳回理由不能超过 ${ORDER_REFUND_LIMITS.reviewReasonMax} 字`;
          },
        }
      );
      const updated = await orderApi.rejectRefund(row.id, {
        reason: value.trim(),
      });
      options.onUpdated(updated);
      ElMessage.success("退款申请已驳回");
      await options.refresh();
    } catch (error: unknown) {
      if (!isMessageBoxCancellation(error)) {
        throw error;
      }
    } finally {
      submitting.delete(row.id);
    }
  }

  return {
    submittingAction,
    advanceRefund: advance,
    rejectRefund: reject,
  };
}
