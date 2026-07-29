import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { NoticeEntity } from '../domain/notice.entity';
import { NoticeRepository } from '../domain/notice-repository.interface';

/** 通知仓储的 TypeORM 实现，读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormNoticeRepository implements NoticeRepository {
  constructor(
    @InjectRepository(NoticeEntity)
    private readonly repo: Repository<NoticeEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findById(id: string): Promise<NoticeEntity | null> {
    return this.repo.findOne({
      where: withTenant<NoticeEntity>(this.tenant, {
        id,
      }) as FindOptionsWhere<NoticeEntity>,
    });
  }

  paginate(skip: number, take: number): Promise<[NoticeEntity[], number]> {
    return this.repo.findAndCount({
      where: withTenant<NoticeEntity>(this.tenant, {}),
      order: { sort: 'ASC', createdAt: 'DESC' },
      skip,
      take,
    });
  }

  findEnabled(): Promise<NoticeEntity[]> {
    return this.repo.find({
      where: withTenant<NoticeEntity>(this.tenant, { enabled: true }),
      order: { sort: 'ASC', createdAt: 'DESC' },
    });
  }

  findLatestPopup(tenantId: string): Promise<NoticeEntity | null> {
    return this.repo.findOne({
      where: { tenantId, enabled: true, popup: true },
      order: { sort: 'ASC', createdAt: 'DESC' },
    });
  }

  create(data: Partial<NoticeEntity>): NoticeEntity {
    return this.repo.create(data);
  }

  save(entity: NoticeEntity): Promise<NoticeEntity> {
    return this.repo.save(entity);
  }

  async remove(entity: NoticeEntity): Promise<void> {
    await this.repo.remove(entity);
  }
}
