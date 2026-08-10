import {
  OrderBoosterSelectionMode,
  OrderPaymentMethod,
  OrderRefundStatus,
  OrderStatus,
  type AdminOrderView,
} from "@app/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useOrderRefundReview } from "./use-order-refund-review";

const mocks = vi.hoisted(() => ({
  approveRefund: vi.fn(),
  confirm: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  prompt: vi.fn(),
  rejectRefund: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
}));

vi.mock("@/api/order.api", () => ({
  orderApi: {
    approveRefund: mocks.approveRefund,
    rejectRefund: mocks.rejectRefund,
  },
}));

vi.mock("element-plus", () => ({
  ElMessage: {
    error: mocks.error,
    info: mocks.info,
    success: mocks.success,
    warning: mocks.warning,
  },
  ElMessageBox: {
    confirm: mocks.confirm,
    prompt: mocks.prompt,
  },
}));

beforeEach(() => {
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
});

describe("useOrderRefundReview 单飞保护", () => {
  it("确认弹窗期间阻止同一订单重复同意", async () => {
    const confirm = deferred<"confirm">();
    const order = makeOrder();
    const refresh = vi.fn(async () => undefined);
    mocks.confirm.mockReturnValue(confirm.promise);
    mocks.approveRefund.mockResolvedValue(order);
    const review = useOrderRefundReview({ onUpdated: vi.fn(), refresh });

    const first = review.advanceRefund(order);
    const second = review.advanceRefund(order);

    expect(review.submittingAction(order.id)).toBe("advance");
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.approveRefund).not.toHaveBeenCalled();
    confirm.resolve("confirm");
    await Promise.all([first, second]);
    expect(mocks.approveRefund).toHaveBeenCalledTimes(1);
    expect(review.submittingAction(order.id)).toBeUndefined();
  });

  it("驳回输入框期间阻止同一订单重复审核", async () => {
    const prompt = deferred<{ value: string }>();
    const order = makeOrder();
    mocks.prompt.mockReturnValue(prompt.promise);
    mocks.rejectRefund.mockResolvedValue({
      ...order,
      refund: order.refund
        ? { ...order.refund, status: OrderRefundStatus.Rejected }
        : null,
    });
    const review = useOrderRefundReview({
      onUpdated: vi.fn(),
      refresh: vi.fn(async () => undefined),
    });

    const first = review.rejectRefund(order);
    const second = review.advanceRefund(order);

    expect(review.submittingAction(order.id)).toBe("reject");
    expect(mocks.prompt).toHaveBeenCalledTimes(1);
    expect(mocks.confirm).not.toHaveBeenCalled();
    prompt.resolve({ value: " 已协商继续履约 " });
    await Promise.all([first, second]);
    expect(mocks.rejectRefund).toHaveBeenCalledTimes(1);
    expect(mocks.rejectRefund).toHaveBeenCalledWith(order.id, {
      reason: "已协商继续履约",
    });
  });

  it.each(["confirm", "prompt"] as const)(
    "取消 %s 不提交请求且正常结束",
    async (modal) => {
      const order = makeOrder();
      const review = makeReview();
      mocks[modal].mockRejectedValue("cancel");
      const run =
        modal === "confirm"
          ? review.advanceRefund(order)
          : review.rejectRefund(order);

      await expect(run).resolves.toBeUndefined();

      expect(review.submittingAction(order.id)).toBeUndefined();
      expect(mocks.approveRefund).not.toHaveBeenCalled();
      expect(mocks.rejectRefund).not.toHaveBeenCalled();
    }
  );
});

function makeReview() {
  return useOrderRefundReview({
    onUpdated: vi.fn(),
    refresh: vi.fn(async () => undefined),
  });
}

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve: (value: T) => void = () => undefined;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

function makeOrder(): AdminOrderView {
  return {
    id: "order-1",
    orderNo: "ORDER-1",
    productId: "product-1",
    productTitle: "陪玩服务",
    productCover: "",
    productCoverSub: "",
    quantity: 1,
    amountFen: 500,
    amountYuan: "5.00",
    originalAmountFen: 500,
    discountBp: 10_000,
    couponDeductionFen: 0,
    commissionFen: 0,
    commissionRateBp: 0,
    provider: OrderPaymentMethod.Balance,
    status: OrderStatus.RefundReviewing,
    canRequestRefund: false,
    refund: {
      id: "refund-1",
      refundNo: "REFUND-1",
      status: OrderRefundStatus.PendingReview,
      amountFen: 500,
      amountYuan: "5.00",
      paymentMethod: OrderPaymentMethod.Balance,
      reason: "临时无法继续服务",
      reviewerId: "",
      rejectReason: "",
      failReason: "",
      requestedAt: "2026-07-22T00:00:00.000Z",
      reviewedAt: "",
      refundedAt: "",
    },
    remark: "",
    remarkMedia: [],
    accountInfo: "",
    boosterId: "",
    boosterName: "",
    gameAccountId: "123456",
    gameTextId: "",
    serviceRegion: "delta-mobile",
    boosterSelectionMode: OrderBoosterSelectionMode.Auto,
    requestedBoosterId: "",
    requestedBoosterName: "",
    createdAt: "2026-07-22T00:00:00.000Z",
    paidAt: "2026-07-22T00:00:00.000Z",
    dispatchedAt: "",
    acceptedAt: "",
    completedAt: "",
    cancelledAt: "",
    conversationId: "conversation-1",
    userId: "owner-1",
    serviceAgentId: "agent-1",
    providerTradeNo: "BALANCE-order-1",
  };
}
