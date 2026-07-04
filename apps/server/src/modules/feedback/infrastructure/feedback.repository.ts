import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { FeedbackStatus, FeedbackType } from '@app/contracts';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { FeedbackEntity } from '../domain/feedback.entity';
import { FeedbackRepository } from '../domain/feedback-repository.interface';

/** 反馈仓储的 TypeORM 实现，读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormFeedbackRepository implements FeedbackRepository {
  constructor(
    @InjectRepository(FeedbackEntity)
    private readonly repo: Repository<FeedbackEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findById(id: string): Promise<FeedbackEntity | null> {
    return this.repo.findOne({
      where: withTenant<FeedbackEntity>(this.tenant, {
        id,
      }) as FindOptionsWhere<FeedbackEntity>,
    });
  }

  paginate(
    skip: number,
    take: number,
    status?: FeedbackStatus,
    type?: FeedbackType,
  ): Promise<[FeedbackEntity[], number]> {
    const base = {
      ...(status ? { status } : {}),
      ...(type ? { type } : {}),
    };
    return this.repo.findAndCount({
      where: withTenant<FeedbackEntity>(this.tenant, base),
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  paginateByUser(
    userId: string,
    skip: number,
    take: number,
  ): Promise<[FeedbackEntity[], number]> {
    return this.repo.findAndCount({
      where: withTenant<FeedbackEntity>(this.tenant, { userId }),
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  create(data: Partial<FeedbackEntity>): FeedbackEntity {
    return this.repo.create(data);
  }

  save(entity: FeedbackEntity): Promise<FeedbackEntity> {
    return this.repo.save(entity);
  }
}
