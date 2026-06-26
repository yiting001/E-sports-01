/**
 * 统一 API 响应结构。
 * 后端通过响应拦截器包装，前端按此类型解析。
 */
export interface ApiResponse<T = unknown> {
  /** 业务状态码，0 表示成功 */
  code: number;
  /** 提示信息 */
  message: string;
  /** 业务数据 */
  data: T;
  /** 服务器时间戳（毫秒） */
  timestamp: number;
}

/** 业务通用状态码 */
export enum BizCode {
  Success = 0,
  Fail = 1,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  ServerError = 500,
}
