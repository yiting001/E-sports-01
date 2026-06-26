import type { ApiResponse, TokenPair } from '@app/contracts';
import { BizCode } from '@app/contracts';
import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { ENV } from '@/config/env';
import { tokenStorage } from './token-storage';

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
  const token = tokenStorage.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** 刷新令牌的并发去重：多请求同时 401 时只发起一次刷新 */
let refreshing: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) {
    throw new Error('NO_REFRESH_TOKEN');
  }
  const { data } = await axios.post<ApiResponse<TokenPair>>(
    `${ENV.apiBaseUrl}/auth/refresh`,
    { refreshToken },
  );
  tokenStorage.save(data.data);
  return data.data.accessToken;
}

instance.interceptors.response.use(
  (response) => {
    const body = response.data as ApiResponse;
    const data = body && typeof body.code === 'number' ? body.data : body;
    return data as unknown as AxiosResponse;
  },
  async (error: AxiosError<ApiResponse>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retried?: boolean };
    const status = error.response?.status;

    if (status === BizCode.Unauthorized && original && !original._retried) {
      original._retried = true;
      try {
        refreshing = refreshing ?? refreshAccessToken();
        const newToken = await refreshing;
        refreshing = null;
        original.headers.Authorization = `Bearer ${newToken}`;
        return instance(original);
      } catch (refreshError) {
        refreshing = null;
        tokenStorage.clear();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export const http = instance;
