import { Inject, Injectable } from '@nestjs/common';
import {
  LOG_REPOSITORY,
  LogRepository,
} from '../../domain/log-repository.interface';
import { LogSettingsService } from '../log-settings.service';

/** 清理结果 */
export interface PurgeResult {
  /** 实际使用的保留天数 */
  retentionDays: number;
  /** 删除的日志条数 */
  deleted: number;
}

/** 用例：按保留天数清理过期日志 */
@Injectable()
export class PurgeLogsUseCase {
  constructor(
    @Inject(LOG_REPOSITORY) private readonly repository: LogRepository,
    private readonly settings: LogSettingsService,
  ) {}

  /** days 缺省时回退到配置中心的保留天数 */
  async execute(days?: number): Promise<PurgeResult> {
    const retentionDays =
      days ?? (await this.settings.resolve()).retentionDays;
    const threshold = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const deleted = await this.repository.deleteOlderThan(threshold);
    return { retentionDays, deleted };
  }
}
