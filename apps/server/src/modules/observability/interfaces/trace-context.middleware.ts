import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import {
  TraceContext,
  TraceContextService,
} from '../application/trace-context.service';
import { TRACE_HEADERS } from '../domain/trace.constants';

/**
 * 链路上下文中间件。
 * 为每个 HTTP 请求建立 AsyncLocalStorage 上下文：解析/生成 traceId，
 * 回写 x-trace-id 响应头，并在该上下文内继续后续处理，使全链路日志可串联。
 */
@Injectable()
export class TraceContextMiddleware implements NestMiddleware {
  constructor(private readonly trace: TraceContextService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const traceId = TraceContextService.resolveTraceId(
      this.header(req, TRACE_HEADERS.traceId),
      this.header(req, TRACE_HEADERS.traceparent),
    );
    const context: TraceContext = {
      traceId,
      spanId: TraceContextService.newSpanId(),
      userId: null,
      username: null,
    };
    res.setHeader(TRACE_HEADERS.traceId, traceId);
    this.trace.run(context, () => next());
  }

  private header(req: Request, name: string): string | undefined {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : value;
  }
}
