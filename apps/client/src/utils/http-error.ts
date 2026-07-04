import type { ApiResponse } from '@app/contracts';
import { AxiosError } from 'axios';

/**
 * 从任意请求异常中提取面向用户的错误信息。
 * 优先取后端统一响应里的 message（经全局异常过滤器归一化），
 * 退化到 Axios/Error 的 message，最后给出兜底文案。
 */
export function resolveHttpErrorMessage(error: unknown, fallback = '操作失败'): string {
  if (error instanceof AxiosError) {
    const body = error.response?.data as ApiResponse | undefined;
    if (body && typeof body.message === 'string' && body.message) {
      return body.message;
    }
    if (error.message) {
      return error.message;
    }
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
