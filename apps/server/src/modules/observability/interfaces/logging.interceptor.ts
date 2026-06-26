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

/** detail 字段最大长度，避免超长请求体撑爆日志表 */
const DETAIL_MAX_LENGTH = 4000;
/** 请求体中需脱敏的字段名（不区分大小写、子串匹配） */
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'authorization'];

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
      detail: isError ? this.buildDetail(req, error) : null,
    };
    this.writer.enqueue(draft);
  }

  /**
   * 组装错误详情：异常响应体（含 ValidationPipe 的 message 数组）+ 脱敏请求体，
   * 便于在链路追踪里直接定位是哪个字段不合法，而非只看到通用堆栈。
   */
  private buildDetail(req: AuthedRequest, error: unknown): string | null {
    const detail: { response?: unknown; body?: unknown } = {};
    if (error instanceof HttpException) {
      detail.response = error.getResponse();
    }
    if (this.hasBody(req.body)) {
      detail.body = this.sanitize(req.body);
    }
    if (detail.response === undefined && detail.body === undefined) {
      return null;
    }
    try {
      const text = JSON.stringify(detail);
      return text.length > DETAIL_MAX_LENGTH
        ? `${text.slice(0, DETAIL_MAX_LENGTH)}…`
        : text;
    } catch {
      return null;
    }
  }

  /** 判断请求体是否有内容（排除 GET 等空体请求） */
  private hasBody(body: unknown): boolean {
    if (body === undefined || body === null) {
      return false;
    }
    if (typeof body === 'object' && Object.keys(body).length === 0) {
      return false;
    }
    return true;
  }

  /** 递归脱敏：命中敏感字段名的值替换为 ***，避免日志泄露凭证 */
  private sanitize(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.sanitize(item));
    }
    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.isSensitive(key) ? '***' : this.sanitize(val);
      }
      return result;
    }
    return value;
  }

  private isSensitive(key: string): boolean {
    const lower = key.toLowerCase();
    return SENSITIVE_KEYS.some((s) => lower.includes(s));
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
