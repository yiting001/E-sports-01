import { BizCode } from "@app/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

interface TestRequestConfig {
  _retried?: boolean;
  _tenantCode?: string;
  _tenantRevision?: number;
  _authSessionGeneration?: number;
  tenantEntryProbe?: boolean;
  headers: Record<string, string>;
}

interface TestSessionSnapshot {
  tenantCode: string;
  tenantRevision: number;
  generation: number;
  refreshToken: string | null;
}

type RejectedInterceptor = (error: {
  config: TestRequestConfig;
  response: { status: number };
}) => Promise<unknown>;

type RequestInterceptor = (config: TestRequestConfig) => TestRequestConfig;
type FulfilledInterceptor = (response: {
  config: TestRequestConfig;
  data: unknown;
}) => unknown;

const axiosMocks = vi.hoisted(() => {
  const handlers: {
    fulfilled?: FulfilledInterceptor;
    rejected?: RejectedInterceptor;
    request?: RequestInterceptor;
  } = {};
  const instance = Object.assign(vi.fn(), {
    interceptors: {
      request: {
        use: vi.fn((fulfilled: RequestInterceptor) => {
          handlers.request = fulfilled;
        }),
      },
      response: {
        use: vi.fn(
          (fulfilled: FulfilledInterceptor, rejected: RejectedInterceptor) => {
            handlers.fulfilled = fulfilled;
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

const contextMocks = vi.hoisted(() => {
  const tenant = { code: "tenant-one", revision: 0 };
  const rejectCurrentTenant = vi.fn(
    (tenantCode: string, tenantRevision: number): boolean => {
      if (
        tenant.code !== tenantCode ||
        tenant.revision !== tenantRevision
      ) {
        return false;
      }
      tenant.revision += 1;
      return true;
    }
  );
  const tokenState = {
    accessToken: null as string | null,
    refreshToken: null as string | null,
    generation: 0,
  };
  const captureSession = (): TestSessionSnapshot => ({
    tenantCode: tenant.code,
    tenantRevision: tenant.revision,
    generation: tokenState.generation,
    refreshToken: tokenState.refreshToken,
  });
  const isCurrentSession = (snapshot: TestSessionSnapshot): boolean =>
    snapshot.tenantCode === tenant.code &&
    snapshot.tenantRevision === tenant.revision &&
    snapshot.generation === tokenState.generation &&
    snapshot.refreshToken === tokenState.refreshToken;
  const clear = vi.fn(() => {
    tokenState.accessToken = null;
    tokenState.refreshToken = null;
    tokenState.generation += 1;
  });
  const save = vi.fn(
    (pair: { accessToken: string; refreshToken: string }) => {
      tokenState.accessToken = pair.accessToken;
      tokenState.refreshToken = pair.refreshToken;
      tokenState.generation += 1;
    }
  );
  return {
    tenant,
    rejectCurrentTenant,
    tokenState,
    token: {
      captureSession: vi.fn(captureSession),
      clear,
      clearIfCurrent: vi.fn((snapshot: TestSessionSnapshot) => {
        if (!isCurrentSession(snapshot)) {
          return false;
        }
        clear();
        return true;
      }),
      getAccess: vi.fn(() => tokenState.accessToken),
      getRefresh: vi.fn(() => tokenState.refreshToken),
      getSessionGeneration: vi.fn(() => tokenState.generation),
      isCurrentSession: vi.fn(isCurrentSession),
      save,
      saveRefreshed: vi.fn(
        (
          pair: { accessToken: string; refreshToken: string },
          snapshot: TestSessionSnapshot
        ): TestSessionSnapshot | null => {
          if (!isCurrentSession(snapshot)) {
            return null;
          }
          tokenState.accessToken = pair.accessToken;
          tokenState.refreshToken = pair.refreshToken;
          return captureSession();
        }
      ),
    },
  };
});
const tenantMocks = contextMocks.tenant;
const tokenState = contextMocks.tokenState;
const tokenMocks = contextMocks.token;
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
vi.mock("@/api/token-storage", () => ({ tokenStorage: contextMocks.token }));
vi.mock("@/tenant/tenant-context", () => ({
  TENANT_HEADER_NAME: "X-Tenant-Code",
  TENANT_UNAVAILABLE_ENTRY_MESSAGE: "租户不存在或已停用",
  tenantContext: {
    getCode: vi.fn(() => contextMocks.tenant.code),
    getRequestCode: vi.fn(() => contextMocks.tenant.code),
    rejectCurrent: contextMocks.rejectCurrentTenant,
    revision: {
      get value() {
        return contextMocks.tenant.revision;
      },
    },
  },
}));

import {
  AUTH_SESSION_EXPIRED_EVENT,
  StaleTenantRequestError,
} from "@/api/http";

beforeEach(() => {
  tenantMocks.code = "tenant-one";
  tenantMocks.revision = 0;
  tokenState.accessToken = null;
  tokenState.refreshToken = null;
  tokenState.generation = 0;
  contextMocks.rejectCurrentTenant.mockClear();
  axiosMocks.post.mockReset();
  for (const mock of Object.values(tokenMocks)) {
    mock.mockClear();
  }
  messageMocks.error.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HTTP session expiry", () => {
  it("为所有请求注入当前租户编码", () => {
    const config = axiosMocks.handlers.request?.({ headers: {} });

    expect(config?.headers["X-Tenant-Code"]).toBe("tenant-one");
    expect(config?._tenantCode).toBe("tenant-one");
    expect(config?._tenantRevision).toBe(0);
    expect(config?._authSessionGeneration).toBe(0);
  });

  it("租户切换后取消旧租户的成功与失败响应", async () => {
    const config = axiosMocks.handlers.request?.({ headers: {} });
    expect(config).toBeDefined();
    tenantMocks.code = "tenant-two";
    tenantMocks.revision = 1;

    expect(() =>
      axiosMocks.handlers.fulfilled?.({
        config: config!,
        data: { data: "old" },
      })
    ).toThrow(StaleTenantRequestError);
    await expect(
      axiosMocks.handlers.rejected?.({
        config: config!,
        response: { status: BizCode.Unauthorized },
      })
    ).rejects.toBeInstanceOf(StaleTenantRequestError);
    expect(axiosMocks.post).not.toHaveBeenCalled();
    expect(tokenMocks.clear).not.toHaveBeenCalled();
    expect(messageMocks.error).not.toHaveBeenCalled();

    tenantMocks.code = "tenant-one";
    tenantMocks.revision = 2;
    expect(() =>
      axiosMocks.handlers.fulfilled?.({
        config: config!,
        data: { data: "still-old" },
      })
    ).toThrow(StaleTenantRequestError);
  });

  it("无效租户入口在发送网络请求前失败", async () => {
    const { tenantContext } = await import("@/tenant/tenant-context");
    vi.mocked(tenantContext.getRequestCode).mockImplementationOnce(() => {
      throw new Error("租户地址无效");
    });

    expect(() => axiosMocks.handlers.request?.({ headers: {} })).toThrow(
      "租户地址无效"
    );
  });

  it("公开租户探针被拒绝时关闭当前租户入口且不触发会话过期", async () => {
    const browserWindow = new EventTarget();
    vi.stubGlobal("window", browserWindow);
    const listener = vi.fn();
    browserWindow.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
    const config = axiosMocks.handlers.request?.({
      headers: {},
      tenantEntryProbe: true,
    });
    expect(config).toBeDefined();

    await expect(
      axiosMocks.handlers.rejected?.({
        config: config!,
        response: { status: BizCode.Unauthorized },
      })
    ).rejects.toThrow("租户不存在或已停用");

    expect(contextMocks.rejectCurrentTenant).toHaveBeenCalledWith(
      "tenant-one",
      0
    );
    expect(axiosMocks.post).not.toHaveBeenCalled();
    expect(tokenMocks.clear).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(messageMocks.error).not.toHaveBeenCalled();
  });

  it("刷新令牌失败时清理令牌并通知应用壳关闭常驻连接", async () => {
    const browserWindow = new EventTarget();
    vi.stubGlobal("window", browserWindow);
    const listener = vi.fn();
    browserWindow.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
    const rejected = axiosMocks.handlers.rejected;
    expect(rejected).toBeTypeOf("function");
    const config = axiosMocks.handlers.request?.({ headers: {} });
    expect(config).toBeDefined();

    await expect(
      rejected?.({
        config: config!,
        response: { status: BizCode.Unauthorized },
      })
    ).rejects.toThrow("NO_REFRESH_TOKEN");

    expect(tokenMocks.clear).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(messageMocks.error).toHaveBeenCalledWith("登录状态已失效");
  });

  it("租户切换后丢弃旧租户晚到的刷新结果", async () => {
    const browserWindow = new EventTarget();
    vi.stubGlobal("window", browserWindow);
    const listener = vi.fn();
    browserWindow.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
    tokenState.refreshToken = "refresh-one";
    let resolveRefresh: ((value: unknown) => void) | undefined;
    axiosMocks.post.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      })
    );

    const config = axiosMocks.handlers.request?.({ headers: {} });
    expect(config).toBeDefined();
    const refreshing = axiosMocks.handlers.rejected?.({
      config: config!,
      response: { status: BizCode.Unauthorized },
    });
    tenantMocks.code = "tenant-two";
    tenantMocks.revision = 1;
    tokenState.generation = 1;
    resolveRefresh?.({
      data: {
        data: { accessToken: "late-access", refreshToken: "late-refresh" },
      },
    });

    await expect(refreshing).rejects.toThrow("TENANT_CONTEXT_CHANGED");
    expect(tokenMocks.save).not.toHaveBeenCalled();
    expect(tokenMocks.clear).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(messageMocks.error).not.toHaveBeenCalled();
  });

  it("租户切换后再返回原租户时仍丢弃旧修订的刷新结果", async () => {
    const browserWindow = new EventTarget();
    vi.stubGlobal("window", browserWindow);
    const listener = vi.fn();
    browserWindow.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
    tokenState.refreshToken = "refresh-one";
    let resolveRefresh: ((value: unknown) => void) | undefined;
    axiosMocks.post.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      })
    );

    const config = axiosMocks.handlers.request?.({ headers: {} });
    expect(config).toBeDefined();
    const refreshing = axiosMocks.handlers.rejected?.({
      config: config!,
      response: { status: BizCode.Unauthorized },
    });
    tenantMocks.code = "tenant-two";
    tenantMocks.revision = 1;
    tenantMocks.code = "tenant-one";
    tenantMocks.revision = 2;
    tokenState.generation = 2;
    resolveRefresh?.({
      data: {
        data: { accessToken: "late-access", refreshToken: "late-refresh" },
      },
    });

    await expect(refreshing).rejects.toThrow("TENANT_CONTEXT_CHANGED");
    expect(tokenMocks.save).not.toHaveBeenCalled();
    expect(tokenMocks.clear).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(messageMocks.error).not.toHaveBeenCalled();
  });

  it("同租户退出并重新登录后丢弃上一会话的刷新结果", async () => {
    const browserWindow = new EventTarget();
    vi.stubGlobal("window", browserWindow);
    const listener = vi.fn();
    browserWindow.addEventListener(AUTH_SESSION_EXPIRED_EVENT, listener);
    tokenState.refreshToken = "refresh-one";
    let resolveRefresh: ((value: unknown) => void) | undefined;
    axiosMocks.post.mockReturnValue(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      })
    );

    const config = axiosMocks.handlers.request?.({ headers: {} });
    expect(config).toBeDefined();
    const refreshing = axiosMocks.handlers.rejected?.({
      config: config!,
      response: { status: BizCode.Unauthorized },
    });
    tokenState.refreshToken = "refresh-new-session";
    tokenState.generation = 2;
    resolveRefresh?.({
      data: {
        data: { accessToken: "late-access", refreshToken: "late-refresh" },
      },
    });

    await expect(refreshing).rejects.toThrow("TENANT_CONTEXT_CHANGED");
    expect(tokenMocks.save).not.toHaveBeenCalled();
    expect(tokenMocks.clear).not.toHaveBeenCalled();
    expect(listener).not.toHaveBeenCalled();
    expect(messageMocks.error).not.toHaveBeenCalled();
  });
});
