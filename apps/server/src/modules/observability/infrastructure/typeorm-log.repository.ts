import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  LessThan,
  LessThanOrEqual,
  Like,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import type { FindOptionsWhere } from 'typeorm';
import { PaginatedResult } from '@app/contracts';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { SysLog } from '../domain/sys-log.entity';
import { LogRepository } from '../domain/log-repository.interface';
import { LogFilter, LogRecordDraft } from '../domain/log-record';

/** 日志仓储的 TypeORM 实现。读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormLogRepository implements LogRepository {
  constructor(
    @InjectRepository(SysLog)
    private readonly repo: Repository<SysLog>,
    private readonly tenant: TenantContextService,
  ) {}

  async saveMany(records: LogRecordDraft[]): Promise<void> {
    if (records.length === 0) {
      return;
    }
    await this.repo.insert(records.map((r) => this.repo.create(r)));
  }

  async paginate(
    skip: number,
    take: number,
    filter: LogFilter,
  ): Promise<PaginatedResult<SysLog>> {
    const where = this.buildWhere(filter);
    const [list, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return { list, total, page: 0, pageSize: take };
  }

  findByTraceId(traceId: string): Promise<SysLog[]> {
    return this.repo.find({
      where: withTenant<SysLog>(this.tenant, { traceId }) as FindOptionsWhere<SysLog>,
      order: { createdAt: 'ASC' },
    });
  }

  async deleteOlderThan(threshold: Date): Promise<number> {
    const result = await this.repo.delete(
      withTenant<SysLog>(this.tenant, { createdAt: LessThan(threshold) }) as FindOptionsWhere<SysLog>,
    );
    return result.affected ?? 0;
  }

  /** 将领域过滤条件翻译为 TypeORM where 子句 */
  private buildWhere(filter: LogFilter): FindOptionsWhere<SysLog> {
    const tenantId = this.tenant.scopeId();
    const where: FindOptionsWhere<SysLog> = tenantId ? { tenantId } : {};
    if (filter.level) {
      where.level = filter.level;
    }
    if (filter.type) {
      where.type = filter.type;
    }
    if (filter.traceId) {
      where.traceId = filter.traceId;
    }
    if (filter.path) {
      where.path = Like(`%${filter.path}%`);
    }
    if (filter.userId) {
      where.userId = filter.userId;
    }
    where.createdAt = this.buildTimeRange(filter.startTime, filter.endTime);
    if (where.createdAt === undefined) {
      delete where.createdAt;
    }
    return where;
  }

  private buildTimeRange(start?: Date, end?: Date) {
    if (start && end) {
      return Between(start, end);
    }
    if (start) {
      return MoreThanOrEqual(start);
    }
    if (end) {
      return LessThanOrEqual(end);
    }
    return undefined;
  }
}
