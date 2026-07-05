import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { BoosterPenaltyEntity } from '../domain/booster-penalty.entity';
import {
  BoosterPenaltyRepository,
  PenaltyFilter,
} from '../domain/penalty-repository.interface';

/** 打手罚款仓储的 TypeORM 实现，读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormBoosterPenaltyRepository implements BoosterPenaltyRepository {
  constructor(
    @InjectRepository(BoosterPenaltyEntity)
    private readonly repo: Repository<BoosterPenaltyEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  paginate(
    skip: number,
    take: number,
    filter: PenaltyFilter,
  ): Promise<[BoosterPenaltyEntity[], number]> {
    const base = filter.boosterUserId
      ? { boosterUserId: filter.boosterUserId }
      : {};
    return this.repo.findAndCount({
      where: withTenant<BoosterPenaltyEntity>(this.tenant, base),
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  create(data: Partial<BoosterPenaltyEntity>): BoosterPenaltyEntity {
    return this.repo.create(data);
  }

  save(entity: BoosterPenaltyEntity): Promise<BoosterPenaltyEntity> {
    return this.repo.save(entity);
  }
}
