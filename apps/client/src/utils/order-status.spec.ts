import { OrderRefundStatus, OrderStatus } from "@app/contracts";
import { describe, expect, it } from "vitest";
import {
  formatOrderDateTime,
  orderRefundStatusTone,
  orderStatusTone,
} from "./order-status";

describe("formatOrderDateTime", () => {
  it("按本地时区格式化 ISO 时间并处理空值和非法值", () => {
    const iso = "2026-07-22T12:34:56.000Z";
    const expected = new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .format(new Date(iso))
      .replaceAll("/", "-");

    expect(formatOrderDateTime(iso)).toBe(expected);
    expect(formatOrderDateTime("")).toBe("-");
    expect(formatOrderDateTime("invalid-date")).toBe("-");
  });
});

describe("orderStatusTone", () => {
  it("把已退款和已完成映射为成功终态", () => {
    expect(orderStatusTone(OrderStatus.Completed)).toBe("success");
    expect(orderStatusTone(OrderStatus.Refunded)).toBe("success");
  });

  it("把取消映射为弱化状态，其余流程映射为进行中", () => {
    expect(orderStatusTone(OrderStatus.Cancelled)).toBe("muted");
    expect(orderStatusTone(OrderStatus.PendingService)).toBe("accent");
    expect(orderStatusTone(OrderStatus.RefundReviewing)).toBe("accent");
  });
});

describe("orderRefundStatusTone", () => {
  it.each([
    [OrderRefundStatus.PendingReview, "accent"],
    [OrderRefundStatus.Processing, "accent"],
    [OrderRefundStatus.Succeeded, "success"],
    [OrderRefundStatus.Rejected, "danger"],
    [OrderRefundStatus.Failed, "danger"],
  ] as const)("映射退款状态 %s", (status, expected) => {
    expect(orderRefundStatusTone(status)).toBe(expected);
  });
});
