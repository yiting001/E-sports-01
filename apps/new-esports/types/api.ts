/**
 * 传输层共享类型（最小镜像，单一来源为 packages/contracts 的 @app/contracts）。
 *
 * 本工程当前以 HBuilderX 原生工程运行、未接入 pnpm workspace，无法直接 import workspace 包，
 * 因此这里只镜像请求层自身必需的最小定义（响应包装 / 通用业务码 / 令牌对 / 默认租户编码）。
 * 接入 workspace 后（新增 package.json 并声明 @app/contracts 依赖）应删除本文件、
 * 改为 `import { BizCode, DEFAULT_TENANT_CODE } from '@app/contracts'`；
 * 业务 DTO（登录、订单、钱包等）不得在此新增，一律走 @app/contracts。
 */

/** 统一 API 响应结构：后端经响应拦截器包装，前端按此解包 */
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

/** 业务通用状态码（与后端 BizCode 一致） */
export enum BizCode {
  Success = 0,
  Fail = 1,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  NotFound = 404,
  Conflict = 409,
  ServerError = 500,
}

/** 登录/刷新返回的令牌对 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  /** accessToken 过期秒数 */
  expiresIn: number;
}

/** 内置默认租户编码 */
export const DEFAULT_TENANT_CODE = 'default';
