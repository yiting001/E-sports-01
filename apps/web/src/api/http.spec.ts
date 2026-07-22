import { BizCode } from "@app/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type RejectedInterceptor = (error: {
  config: { _retried?: boolean; headers: Record<string, string> };
  response: { status: number };
}) => Promise<unknown>;

const axiosMocks = vi.hoisted(() => {
  const handlers: { rejected?: RejectedInterceptor } = {};
  const instance = Object.assign(vi.fn(), {
    interceptors: {
      request: { use: vi.fn() },
      response: {
        use: vi.fn(
          (
            _fulfilled: (value: unknown) => unknown,
            rejected: RejectedInterceptor
          ) => {
            handlers.rejected = rejected;
          }
        ),
      },
    },
  });
  return {
    create: vi.fn(() => instance),
    handlers,
    instance,
    post: vi.fn(),
  };
});

const tokenMocks = vi.hoisted(() => ({
  clear: vi.fn(),
  getAccess: vi.fn(),
  getRefresh: vi.fn(),
  save: vi.fn(),
}));
const messageMocks = vi.hoisted(() => ({ error: vi.fn() }));

vi.mock("axios", () => ({
  default: {
    create: axiosMocks.create,
    post: axiosMocks.post,
  },
}));
vi.mock("element-plus", () => ({ ElMessage: messageMocks }));
vi.mock("@/config/env", () => ({
  ENV: { apiBaseUrl: "http://127.0.0.1:3000/api" },
}));
vi.mock("@/utils/http-error", () => ({
  resolveHttpErrorMessage: vi.fn(() => "登录状态已失效"),
}));
vi.mock("@/api/token-storage", () => ({ tokenStorage: tokenMocks }));

import { AUTH_SESSION_EXPIRED_EVENT } from "@/api/http";

beforeEach(() => {
  for (const mock of Object.values(tokenMocks)) {
    mock.mockReset();
  }
  messageMocks.error.mockReset();
  tokenMocks.getRefresh.mockReturnValue(null);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HTTP session expiry", () => {
  it("刷新令牌失败时清理令牌并通知应用壳关闭常驻连接", async () => {
    const browserWindow = new EventTarget();
    vi.stubGlobal("window", browserWindow);
    const listener = vi.fn();
    browserWindow.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
    const rejected = axiosMocks.handlers.rejected;
    expect(rejected).toBeTypeOf("function");

    await expect(
      rejected?.({
        config: { headers: {} },
        response: { status: BizCode.Unauthorized },
      })
    ).rejects.toThrow("NO_REFRESH_TOKEN");

    expect(tokenMocks.clear).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(messageMocks.error).toHaveBeenCalledWith("登录状态已失效");
  });
});
