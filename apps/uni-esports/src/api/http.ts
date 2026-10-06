import type { ApiResponse, TokenPair } from '@app/contracts';
import { BizCode } from '@app/contracts';
import { ENV } from '@/config/env';
import { toast } from '@/utils/toast';
import {
  TENANT_HEADER_NAME,
  tenantContext,
} from '@/tenant/tenant-context';
import {
  tokenStorage,
  type AuthSessionSnapshot,
} from './token-storage';

/**
 * 小程序端 HTTP 客户端（基于 uni.request）。
 * 与 apps/client 的 http.ts 同语义：注入访问令牌与租户头、解包统一响应、
 * 401 时静默刷新一次令牌后重放请求；错误统一走 toast，silent 可关闭。
 */

export interface RequestOptions {
  /** 本次请求失败不弹全局提示，交由调用方自行处理 */
  silent?: boolean;
}

export interface GetOptions extends RequestOptions {
  params?: Record<string, unknown>;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly bizCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RawResponse {
  statusCode: number;
  data: unknown;
}

/** 登录态过期事件：auth store 监听后清理本地资料，页面无需各自处理 */
const authExpiredListeners = new Set<() => void>();

export function onAuthExpired(listener: () => void): () => void {
  authExpiredListeners.add(listener);
  return () => {
    authExpiredListeners.delete(listener);
  };
}

function assertConfigured(): void {
  if (!ENV.apiBaseUrl) {
    toast('未配置 API 地址，请检查 .env 与构建配置');
    throw new Error('VITE_API_BASE_URL 未配置');
  }
}

function buildUrl(path: string, params?: Record<string, unknown>): string {
  if (!params) {
    return path;
  }
  const query = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join('&');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

function buildHeaders(token: string): Record<string, string> {
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
    [TENANT_HEADER_NAME]: tenantContext.getCode(),
  };
  if (token) {
    header.Authorization = `Bearer ${token}`;
  }
  return header;
}

/** 上传等非 JSON 请求复用同一套鉴权/租户头 */
export function buildAuthHeaders(): Record<string, string> {
  return buildHeaders(tokenStorage.getAccess());
}

function uniRequest(
  method: Method,
  url: string,
  data: unknown,
  header: Record<string, string>,
): Promise<RawResponse> {
  return new Promise((resolve, reject) => {
    uni.request({
      url,
      method,
      data: data === undefined ? {} : (data as Record<string, unknown>),
      header,
      timeout: 15000,
      enableHttp2: true,
      success: resolve,
      fail: (error) => reject(new Error(error.errMsg || '网络连接失败')),
    });
  });
}

function isUnauthorizedResponse(
  status: number,
  body: ApiResponse<unknown> | null,
): boolean {
  return (
    status === BizCode.Unauthorized ||
    (body !== null && body.code === BizCode.Unauthorized)
  );
}

/** 单次请求：不处理 401 刷新，返回已解包的业务数据 */
async function send<T>(
  method: Method,
  path: string,
  options: {
    data?: unknown;
    params?: Record<string, unknown>;
    silent?: boolean;
    withoutAuth?: boolean;
  },
): Promise<T> {
  assertConfigured();
  const url = `${ENV.apiBaseUrl}${buildUrl(path, options.params)}`;
  const header = options.withoutAuth
    ? buildHeaders('')
    : buildHeaders(tokenStorage.getAccess());
  let response: RawResponse;
  try {
    response = await uniRequest(method, url, options.data, header);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '网络连接失败，请稍后重试';
    if (!options.silent) {
      toast(message);
    }
    throw error;
  }

  const body =
    response.data && typeof response.data === 'object'
      ? (response.data as ApiResponse<T>)
      : null;
  const hasEnvelope = body !== null && typeof body.code === 'number';

  if (response.statusCode >= 200 && response.statusCode < 300) {
    if (!hasEnvelope) {
      return response.data as T;
    }
    if (body.code === BizCode.Success) {
      return body.data;
    }
  }

  const message =
    hasEnvelope && body.message
      ? body.message
      : `请求失败（${response.statusCode}）`;
  if (!options.silent) {
    toast(message);
  }
  // 统一以 HTTP 401 标记鉴权失败（部分业务错误会以 200 + code=401 回包），供上层触发令牌刷新
  const unauthorized = isUnauthorizedResponse(response.statusCode, body);
  throw new HttpError(
    unauthorized ? BizCode.Unauthorized : response.statusCode,
    hasEnvelope ? body.code : response.statusCode,
    message,
  );
}

interface RefreshResult {
  accessToken: string;
  session: AuthSessionSnapshot;
}

/** 刷新按会话代数去重：并发 401 只发起一次刷新请求 */
const refreshRequests = new Map<number, Promise<RefreshResult>>();

function refreshForSession(
  snapshot: AuthSessionSnapshot,
): Promise<RefreshResult> {
  const existing = refreshRequests.get(snapshot.generation);
  if (existing) {
    return existing;
  }
  const request = (async (): Promise<RefreshResult> => {
    if (!tokenStorage.isCurrentSession(snapshot)) {
      throw new Error('SESSION_CHANGED');
    }
    const refreshToken = tokenStorage.getRefresh();
    if (!refreshToken) {
      throw new Error('NO_REFRESH_TOKEN');
    }
    const data = await send<TokenPair>('POST', '/auth/refresh', {
      data: { refreshToken },
      silent: true,
      withoutAuth: true,
    });
    if (!tokenStorage.saveRefreshed(data, snapshot)) {
      throw new Error('SESSION_CHANGED');
    }
    return { accessToken: data.accessToken, session: snapshot };
  })();
  refreshRequests.set(snapshot.generation, request);
  void request.catch(() => undefined);
  const cleanup = (): void => {
    if (refreshRequests.get(snapshot.generation) === request) {
      refreshRequests.delete(snapshot.generation);
    }
  };
  void request.then(cleanup, cleanup);
  return request;
}

async function sendWithAuth<T>(
  method: Method,
  path: string,
  options: { data?: unknown; params?: Record<string, unknown>; silent?: boolean },
): Promise<T> {
  const requestGeneration = tokenStorage.getSessionGeneration();
  try {
    return await send<T>(method, path, options);
  } catch (error) {
    const isAuthError =
      error instanceof HttpError && error.status === BizCode.Unauthorized;
    if (!isAuthError || options.silent) {
      throw error;
    }
    const snapshot = tokenStorage.captureSession();
    if (snapshot.generation !== requestGeneration) {
      // 请求期间登录态已变化，不代旧会话刷新
      throw error;
    }
    try {
      await refreshForSession(snapshot);
    } catch {
      if (tokenStorage.clearIfCurrent(snapshot)) {
        if (!options.silent) {
          toast('登录已过期，请重新登录');
        }
        authExpiredListeners.forEach((listener) => listener());
      }
      throw error;
    }
    // 重放一次；仍失败则按普通错误提示，不再触发刷新避免循环
    try {
      return await send<T>(method, path, options);
    } catch (replayError) {
      if (!options.silent && replayError instanceof HttpError) {
        toast(replayError.message);
      }
      throw replayError;
    }
  }
}

export const http = {
  get<T>(path: string, options: GetOptions = {}): Promise<T> {
    return sendWithAuth<T>('GET', path, {
      params: options.params,
      silent: options.silent,
    });
  },
  post<T>(path: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    return sendWithAuth<T>('POST', path, {
      data,
      silent: options.silent,
    });
  },
  put<T>(path: string, data?: unknown, options: RequestOptions = {}): Promise<T> {
    return sendWithAuth<T>('PUT', path, {
      data,
      silent: options.silent,
    });
  },
  delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return sendWithAuth<T>('DELETE', path, {
      silent: options.silent,
    });
  },
};
