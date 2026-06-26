import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { HttpException } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LogLevel, LogType } from '@app/contracts';
import { TraceContextService } from '../application/trace-context.service';
import { LogSettingsService } from '../application/log-settings.service';
import { LogWriter } from '../application/log-writer.service';
import { LogRecordDraft } from '../domain/log-record';

interface AuthedRequest extends Request {
  user?: { id: string; username: string };
}

/**
 * 访问/错误日志拦截器。
 * 在请求完成（成功或异常）后，按配置采样并异步落库一条 access/error 日志，
 * 记录方法、路径、状态码、耗时、用户、IP、UA 与异常栈；不阻塞响应主链路。
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(
    private readonly trace: TraceContextService,
    private readonly settings: LogSettingsService,
    private readonly writer: LogWriter,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const http = context.switchToHttp();
    const req = http.getRequest<AuthedRequest>();
    const res = http.getResponse<Response>();
    const startedAt = Date.now();

    if (req.user) {
      this.trace.setUser(req.user.id, req.user.username);
    }

    return next.handle().pipe(
      tap({
        next: () => this.record(req, res.statusCode, startedAt, null),
        error: (err: unknown) =>
          this.record(req, this.statusOf(err), startedAt, err),
      }),
    );
  }

  private record(
    req: AuthedRequest,
    statusCode: number,
    startedAt: number,
    error: unknown,
  ): void {
    void this.persist(req, statusCode, startedAt, error);
  }

  private async persist(
    req: AuthedRequest,
    statusCode: number,
    startedAt: number,
    error: unknown,
  ): Promise<void> {
    const settings = await this.settings.resolve();
    if (!settings.persistEnabled) {
      return;
    }
    const path = req.originalUrl.split('?')[0];
    if (this.isExcluded(path, settings.excludePaths)) {
      return;
    }
    const isError = error !== null;
    if (!isError && !this.sampled(settings.requestSampleRate)) {
      return;
    }
    const ctx = this.trace.get();
    const draft: LogRecordDraft = {
      traceId: ctx?.traceId ?? '-',
      spanId: ctx?.spanId ?? '-',
      level: isError ? LogLevel.Error : LogLevel.Info,
      type: isError ? LogType.Error : LogType.Access,
      context: 'HTTP',
      message: `${req.method} ${path} ${statusCode}`,
      method: req.method,
      path,
      statusCode,
      durationMs: Date.now() - startedAt,
      userId: req.user?.id ?? null,
      username: req.user?.username ?? null,
      ip: this.clientIp(req),
      userAgent: this.header(req, 'user-agent'),
      stack: error instanceof Error ? (error.stack ?? null) : null,
    };
    this.writer.enqueue(draft);
  }

  private isExcluded(path: string, prefixes: string[]): boolean {
    return prefixes.some((prefix) => path.startsWith(prefix));
  }

  private sampled(rate: number): boolean {
    if (rate >= 1) {
      return true;
    }
    if (rate <= 0) {
      return false;
    }
    return Math.random() < rate;
  }

  private statusOf(error: unknown): number {
    return error instanceof HttpException ? error.getStatus() : 500;
  }

  private clientIp(req: Request): string {
    const forwarded = this.header(req, 'x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    return req.ip ?? '';
  }

  private header(req: Request, name: string): string {
    const value = req.headers[name];
    if (Array.isArray(value)) {
      return value[0] ?? '';
    }
    return value ?? '';
  }
}
