import { BOOSTER_SERVICE_REGION } from "@app/contracts";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { http } from "./http";
import { orderApi } from "./order.api";

vi.mock("./http", () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("orderApi 接单大厅查询", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("携带分页、关键字、区服和静默失败选项", async () => {
    await orderApi.hall(
      2,
      20,
      { keyword: "ORDER-2026", serviceRegion: BOOSTER_SERVICE_REGION.Pc },
      { silent: true }
    );

    expect(http.get).toHaveBeenCalledWith("/order/hall", {
      silent: true,
      params: {
        page: 2,
        pageSize: 20,
        keyword: "ORDER-2026",
        serviceRegion: BOOSTER_SERVICE_REGION.Pc,
      },
    });
  });

  it("详情查询可由页面接管失败提示", async () => {
    await orderApi.hallDetail("order-1", { silent: true });

    expect(http.get).toHaveBeenCalledWith("/order/hall/order-1", {
      silent: true,
    });
  });
});
