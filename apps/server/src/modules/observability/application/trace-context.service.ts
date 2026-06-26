import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes, randomUUID } from 'node:crypto';

/** 单次请求/会话期间随上下文流动的链路信息 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  userId: string | null;
  username: string | null;
}

/**
 * 链路上下文服务。
 * 基于 AsyncLocalStorage 在一次异步调用链内透明传递 traceId/spanId，
 * 使任意层（日志、异常、网关）无需层层传参即可获取当前链路标识。
 */
@Injectable()
export class TraceContextService {
  private readonly storage = new AsyncLocalStorage<TraceContext>();

  /** 在给定上下文中运行回调，回调内部及其异步后继均可读到该上下文 */
  run<T>(context: TraceContext, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  /** 取当前上下文（不在追踪范围内时返回 undefined） */
  get(): TraceContext | undefined {
    return this.storage.getStore();
  }

  /** 取当前 traceId，缺省回退为占位符，保证日志字段非空 */
  get traceId(): string {
    return this.storage.getStore()?.traceId ?? '-';
  }

  /** 取当前 spanId */
  get spanId(): string {
    return this.storage.getStore()?.spanId ?? '-';
  }

  /** 在已存在的上下文上补充用户信息（鉴权完成后调用） */
  setUser(userId: string | null, username: string | null): void {
    const store = this.storage.getStore();
    if (store) {
      store.userId = userId;
      store.username = username;
    }
  }

  /** 生成新的 traceId（去横线 UUID，紧凑且全局唯一） */
  static newTraceId(): string {
    return randomUUID().replace(/-/g, '');
  }

  /** 生成新的 spanId（8 字节十六进制） */
  static newSpanId(): string {
    return randomBytes(8).toString('hex');
  }

  /**
   * 解析上游链路标识：优先自定义头，其次 W3C traceparent。
   * 解析失败则新建，保证始终有 traceId。
   */
  static resolveTraceId(headerTraceId?: string, traceparent?: string): string {
    if (headerTraceId && headerTraceId.trim()) {
      return headerTraceId.trim();
    }
    const fromW3c = TraceContextService.parseTraceparent(traceparent);
    return fromW3c ?? TraceContextService.newTraceId();
  }

  /** 解析 W3C traceparent（version-traceid-spanid-flags），取其中 trace-id 段 */
  private static parseTraceparent(traceparent?: string): string | null {
    if (!traceparent) {
      return null;
    }
    const segments = traceparent.split('-');
    const traceIdSegment = segments[1];
    return traceIdSegment && /^[0-9a-f]{32}$/i.test(traceIdSegment)
      ? traceIdSegment
      : null;
  }
}
