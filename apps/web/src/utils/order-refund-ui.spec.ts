import { OrderRefundStatus } from "@app/contracts";
import { describe, expect, it } from "vitest";
import {
  canShowRefundReviewAction,
  refundPrimaryAction,
  refundTagType,
} from "./order-refund-ui";

describe("refundPrimaryAction", () => {
  it.each([
    [OrderRefundStatus.PendingReview, { action: "approve", label: "同意退款" }],
    [OrderRefundStatus.Processing, { action: "query", label: "查询退款" }],
    [OrderRefundStatus.Failed, { action: "retry", label: "重试退款" }],
    [OrderRefundStatus.Succeeded, null],
    [OrderRefundStatus.Rejected, null],
  ] as const)("映射退款操作 %s", (status, expected) => {
    expect(refundPrimaryAction(status)).toEqual(expected);
  });
});

describe("refundTagType", () => {
  it.each([
    [OrderRefundStatus.PendingReview, "warning"],
    [OrderRefundStatus.Processing, "info"],
    [OrderRefundStatus.Succeeded, "success"],
    [OrderRefundStatus.Rejected, "danger"],
    [OrderRefundStatus.Failed, "danger"],
  ] as const)("映射退款标签 %s", (status, expected) => {
    expect(refundTagType(status)).toBe(expected);
  });
});

describe("canShowRefundReviewAction", () => {
  it("仅有审核权限且状态存在可执行动作时展示退款操作", () => {
    expect(
      canShowRefundReviewAction(OrderRefundStatus.PendingReview, true)
    ).toBe(true);
    expect(
      canShowRefundReviewAction(OrderRefundStatus.PendingReview, false)
    ).toBe(false);
    expect(canShowRefundReviewAction(OrderRefundStatus.Rejected, true)).toBe(
      false
    );
  });
});
