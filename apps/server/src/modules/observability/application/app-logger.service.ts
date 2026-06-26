import { Injectable } from '@nestjs/common';
import { LOG_LEVEL_WEIGHT, LogLevel, LogType } from '@app/contracts';
import { TraceContextService } from './trace-context.service';
import { LogSettingsService } from './log-settings.service';
import { LogWriter } from './log-writer.service';
import { LogRecordDraft } from '../domain/log-record';

/**
 * 应用日志器。
 * 统一以结构化 JSON 输出到标准输出（便于采集），并按配置把达到阈值的
 * 应用日志异步落库。日志调用同步返回，落库交由缓冲写入器异步完成。
 */
@Injectable()
export class AppLogger {
  constructor(
    private readonly trace: TraceContextService,
    private readonly settings: LogSettingsService,
    private readonly writer: LogWriter,
  ) {}

  debug(message: string, context = ''): void {
    this.write(LogLevel.Debug, message, context);
  }

  info(message: string, context = ''): void {
    this.write(LogLevel.Info, message, context);
  }

  warn(message: string, context = ''): void {
    this.write(LogLevel.Warn, message, context);
  }

  error(message: string, context = '', stack: string | null = null): void {
    this.write(LogLevel.Error, message, context, stack);
  }

  private write(
    level: LogLevel,
    message: string,
    context: string,
    stack: string | null = null,
  ): void {
    const ctx = this.trace.get();
    const traceId = ctx?.traceId ?? '-';
    const entry = {
      time: new Date().toISOString(),
      level,
      traceId,
      context,
      message,
      ...(stack ? { stack } : {}),
    };
    process.stdout.write(`${JSON.stringify(entry)}\n`);
    this.persist(level, message, context, stack, ctx);
  }

  private persist(
    level: LogLevel,
    message: string,
    context: string,
    stack: string | null,
    ctx: ReturnType<TraceContextService['get']>,
  ): void {
    const settings = this.settings.current();
    if (!settings.persistEnabled) {
      return;
    }
    if (LOG_LEVEL_WEIGHT[level] < LOG_LEVEL_WEIGHT[settings.level]) {
      return;
    }
    const draft: LogRecordDraft = {
      traceId: ctx?.traceId ?? '-',
      spanId: ctx?.spanId ?? '-',
      level,
      type: LogType.App,
      context,
      message,
      method: '',
      path: '',
      statusCode: null,
      durationMs: null,
      userId: ctx?.userId ?? null,
      username: ctx?.username ?? null,
      ip: '',
      userAgent: '',
      stack,
    };
    this.writer.enqueue(draft);
  }
}
