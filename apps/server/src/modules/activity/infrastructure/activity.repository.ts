import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, type Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { ActivityEntity } from '../domain/activity.entity';
import { ActivityRepository } from '../domain/activity-repository.interface';

/** 活动仓储的 TypeORM 实现，读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormActivityRepository implements ActivityRepository {
  constructor(
    @InjectRepository(ActivityEntity)
    private readonly repo: Repository<ActivityEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findById(id: string): Promise<ActivityEntity | null> {
    return this.repo.findOne({
      where: withTenant<ActivityEntity>(this.tenant, { id }),
    });
  }

  paginate(skip: number, take: number): Promise<[ActivityEntity[], number]> {
    return this.repo.findAndCount({
      where: withTenant<ActivityEntity>(this.tenant, {}),
      order: { sort: 'ASC', createdAt: 'DESC' },
      skip,
      take,
    });
  }

  findOngoing(now: Date): Promise<ActivityEntity[]> {
    return this.repo.find({
      where: withTenant<ActivityEntity>(this.tenant, {
        enabled: true,
        startAt: LessThanOrEqual(now),
        endAt: MoreThan(now),
      }),
      order: { sort: 'ASC', createdAt: 'DESC' },
    });
  }

  create(data: Partial<ActivityEntity>): ActivityEntity {
    return this.repo.create(data);
  }

  save(entity: ActivityEntity): Promise<ActivityEntity> {
    return this.repo.save(entity);
  }

  async remove(entity: ActivityEntity): Promise<void> {
    await this.repo.remove(entity);
  }
}
