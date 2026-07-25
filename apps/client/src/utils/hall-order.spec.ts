import { BizCode } from "@app/contracts";
import { describe, expect, it } from "vitest";
import {
  alignHallRefreshPageSize,
  isHallOrderUnavailableError,
} from "./hall-order";

describe("接单大厅分页与并发失败状态", () => {
  it("把非整页的已加载数量向上对齐，避免下一页跳单", () => {
    expect(alignHallRefreshPageSize(0, 10, 100)).toBe(10);
    expect(alignHallRefreshPageSize(15, 10, 100)).toBe(20);
    expect(alignHallRefreshPageSize(101, 10, 100)).toBe(100);
  });

  it("只把订单不存在或并发冲突识别为不可接单", () => {
    expect(
      isHallOrderUnavailableError({
        isAxiosError: true,
        response: { status: BizCode.NotFound },
      })
    ).toBe(true);
    expect(
      isHallOrderUnavailableError({
        isAxiosError: true,
        response: { status: BizCode.Conflict },
      })
    ).toBe(true);
    expect(
      isHallOrderUnavailableError({
        isAxiosError: true,
        response: { status: BizCode.Forbidden },
      })
    ).toBe(false);
  });
});
