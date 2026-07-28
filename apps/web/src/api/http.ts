import type { ApiResponse, TokenPair } from "@app/contracts";
import { BizCode } from "@app/contracts";
import axios, {
  AxiosError,
  type AxiosRequestConfig,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";
import { ElMessage } from "element-plus";
import { ENV } from "@/config/env";
import {
  TENANT_HEADER_NAME,
  TENANT_UNAVAILABLE_ENTRY_MESSAGE,
  tenantContext,
} from "@/tenant/tenant-context";
import { resolveHttpErrorMessage } from "@/utils/http-error";
import {
  tokenStorage,
  type AuthSessionSnapshot,
} from "./token-storage";

/** 请求级开关：置 true 时本次请求失败不弹全局提示，交由调用方自行处理 */
export interface RequestOptions extends AxiosRequestConfig {
  silent?: boolean;
  tenantEntryProbe?: boolean;
}

type RequestConfig = InternalAxiosRequestConfig &
  RequestOptions & {
    _retried?: boolean;
    _tenantCode?: string;
    _tenantRevision?: number;
    _authSessionGeneration?: number;
  };

const TENANT_REQUEST_STALE_CODE = "TENANT_REQUEST_STALE";

/** 租户切换后旧请求的取消信号；不应提示接口失败或修改当前租户状态。 */
export class StaleTenantRequestError extends Error {
  readonly code = TENANT_REQUEST_STALE_CODE;

  constructor() {
    super("租户已切换，旧请求已取消");
    this.name = "StaleTenantRequestError";
  }
}

export function isStaleTenantRequestError(
  error: unknown
): error is StaleTenantRequestError {
  return error instanceof StaleTenantRequestError;
}

/** 刷新令牌失败时通知应用壳立即清理内存状态与常驻连接。 */
export const AUTH_SESSION_EXPIRED_EVENT = "app:auth-session-expired";

/**
 * HTTP 客户端。
 * 职责：注入访问令牌、解包统一响应、在 401 时静默刷新一次令牌后重放请求。
 * 业务层拿到的是已解包的 data，无需关心 ApiResponse 包装结构。
 */
const instance: AxiosInstance = axios.create({
  baseURL: ENV.apiBaseUrl,
  timeout: 15000,
});

instance.interceptors.request.use((config) => {
  const requestConfig = config as RequestConfig;
  const tenantCode = tenantContext.getRequestCode();
  requestConfig._tenantCode = tenantCode;
  requestConfig._tenantRevision = tenantContext.revision.value;
  requestConfig._authSessionGeneration = tokenStorage.getSessionGeneration();
  config.headers[TENANT_HEADER_NAME] = tenantCode;
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const TENANT_CONTEXT_CHANGED_ERROR = "TENANT_CONTEXT_CHANGED";

interface RefreshResult {
  accessToken: string;
  session: AuthSessionSnapshot;
}

/** 刷新令牌按租户修订和认证会话去重，旧会话不能复用当前刷新结果。 */
const refreshRequests = new Map<string, Promise<RefreshResult>>();

function refreshRequestKey(snapshot: AuthSessionSnapshot): string {
  return `${snapshot.tenantCode}:${snapshot.tenantRevision}:${snapshot.generation}`;
}

async function refreshAccessToken(
  snapshot: AuthSessionSnapshot
): Promise<RefreshResult> {
  if (!tokenStorage.isCurrentSession(snapshot)) {
    throw new Error(TENANT_CONTEXT_CHANGED_ERROR);
  }
  if (!snapshot.refreshToken) {
    throw new Error("NO_REFRESH_TOKEN");
  }
  const { data } = await axios.post<ApiResponse<TokenPair>>(
    `${ENV.apiBaseUrl}/auth/refresh`,
    { refreshToken: snapshot.refreshToken },
    { headers: { [TENANT_HEADER_NAME]: snapshot.tenantCode } }
  );
  const refreshedSession = tokenStorage.saveRefreshed(data.data, snapshot);
  if (!refreshedSession) {
    throw new Error(TENANT_CONTEXT_CHANGED_ERROR);
  }
  return { accessToken: data.data.accessToken, session: refreshedSession };
}

function refreshForSession(
  snapshot: AuthSessionSnapshot
): Promise<RefreshResult> {
  const requestKey = refreshRequestKey(snapshot);
  const existing = refreshRequests.get(requestKey);
  if (existing) {
    return existing;
  }
  const request = refreshAccessToken(snapshot);
  refreshRequests.set(requestKey, request);
  const cleanup = (): void => {
    if (refreshRequests.get(requestKey) === request) {
      refreshRequests.delete(requestKey);
    }
  };
  void request.then(cleanup, cleanup);
  return request;
}

function requestMatchesSession(
  config: RequestConfig,
  snapshot: AuthSessionSnapshot
): boolean {
  return (
    config._tenantCode === snapshot.tenantCode &&
    config._tenantRevision === snapshot.tenantRevision &&
    config._authSessionGeneration === snapshot.generation
  );
}

function isStaleTenantRequest(config?: RequestConfig): boolean {
  return Boolean(
    config?._tenantCode &&
      (config._tenantCode !== tenantContext.getCode() ||
        config._tenantRevision !== tenantContext.revision.value)
  );
}

instance.interceptors.response.use(
  (response) => {
    if (isStaleTenantRequest(response.config as RequestConfig)) {
      throw new StaleTenantRequestError();
    }
    const body = response.data as ApiResponse;
    const data = body && typeof body.code === "number" ? body.data : body;
    return data as unknown as AxiosResponse;
  },
  async (error: AxiosError<ApiResponse>) => {
    const original = error.config as RequestConfig | undefined;
    const status = error.response?.status;

    if (isStaleTenantRequest(original)) {
      return Promise.reject(new StaleTenantRequestError());
    }

    if (
      status === BizCode.Unauthorized &&
      original?.tenantEntryProbe &&
      original._tenantCode &&
      original._tenantRevision !== undefined
    ) {
      const rejected = tenantContext.rejectCurrent(
        original._tenantCode,
        original._tenantRevision
      );
      return Promise.reject(
        rejected
          ? new Error(TENANT_UNAVAILABLE_ENTRY_MESSAGE)
          : new StaleTenantRequestError()
      );
    }

    if (status === BizCode.Unauthorized && original && !original._retried) {
      original._retried = true;
      const requestSession = tokenStorage.captureSession();
      if (!requestMatchesSession(original, requestSession)) {
        return Promise.reject(new StaleTenantRequestError());
      }
      try {
        const refreshed = await refreshForSession(requestSession);
        if (!tokenStorage.isCurrentSession(refreshed.session)) {
          throw new Error(TENANT_CONTEXT_CHANGED_ERROR);
        }
        original.headers.Authorization = `Bearer ${refreshed.accessToken}`;
        return instance(original);
      } catch (refreshError) {
        if (tokenStorage.clearIfCurrent(requestSession)) {
          window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
          notifyError(error, original);
        }
        return Promise.reject(refreshError);
      }
    }
    notifyError(error, original);
    return Promise.reject(error);
  }
);

/** 统一弹出接口错误提示（单一来源），调用方可用 silent 关闭 */
function notifyError(
  error: AxiosError<ApiResponse>,
  config?: RequestConfig
): void {
  if (config?.silent) {
    return;
  }
  ElMessage.error(resolveHttpErrorMessage(error));
}

export const http = instance;
