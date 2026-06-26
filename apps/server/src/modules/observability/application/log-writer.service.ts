import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  LOG_REPOSITORY,
  LogRepository,
} from '../domain/log-repository.interface';
import { LogRecordDraft } from '../domain/log-record';

/**
 * 日志缓冲写入器。
 * 以内存队列缓冲日志草稿，按时间或批量阈值合并批量落库，
 * 把磁盘 IO 从请求主链路剥离，避免日志写入拖慢响应。
 */
@Injectable()
export class LogWriter implements OnModuleDestroy {
  /** 刷盘周期（毫秒）：运行期调优参数，非业务配置 */
  private static readonly FLUSH_INTERVAL_MS = 2000;
  /** 触发立即刷盘的缓冲条数上限，防止突发流量积压 */
  private static readonly MAX_BUFFER = 200;

  private readonly logger = new Logger(LogWriter.name);
  private buffer: LogRecordDraft[] = [];
  private timer: NodeJS.Timeout | null = null;
  private flushing = false;

  constructor(
    @Inject(LOG_REPOSITORY) private readonly repository: LogRepository,
  ) {}

  /** 入队一条日志；达到阈值即触发刷盘，否则等待定时刷盘 */
  enqueue(record: LogRecordDraft): void {
    this.buffer.push(record);
    this.ensureTimer();
    if (this.buffer.length >= LogWriter.MAX_BUFFER) {
      void this.flush();
    }
  }

  /** 将当前缓冲批量写库；写库失败不抛出，避免影响业务流程 */
  async flush(): Promise<void> {
    if (this.flushing || this.buffer.length === 0) {
      return;
    }
    this.flushing = true;
    const batch = this.buffer;
    this.buffer = [];
    try {
      await this.repository.saveMany(batch);
    } catch (error) {
      this.logger.error(
        `日志落库失败，丢弃 ${batch.length} 条`,
        error instanceof Error ? error.stack : undefined,
      );
    } finally {
      this.flushing = false;
    }
  }

  /** 进程关闭前清空缓冲，防止丢日志 */
  async onModuleDestroy(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    await this.flush();
  }

  private ensureTimer(): void {
    if (this.timer) {
      return;
    }
    this.timer = setInterval(() => {
      void this.flush();
    }, LogWriter.FLUSH_INTERVAL_MS);
    this.timer.unref?.();
  }
}
