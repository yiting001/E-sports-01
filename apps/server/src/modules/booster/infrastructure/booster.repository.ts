import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { BoosterStatus } from '@app/contracts';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { BoosterApplicationEntity } from '../domain/booster-application.entity';
import { BoosterRepository } from '../domain/booster-repository.interface';

/** 打手入驻申请仓储的 TypeORM 实现，读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormBoosterRepository implements BoosterRepository {
  constructor(
    @InjectRepository(BoosterApplicationEntity)
    private readonly repo: Repository<BoosterApplicationEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findByUserId(userId: string): Promise<BoosterApplicationEntity | null> {
    return this.repo.findOne({
      where: withTenant<BoosterApplicationEntity>(this.tenant, {
        userId,
      }) as FindOptionsWhere<BoosterApplicationEntity>,
    });
  }

  findById(id: string): Promise<BoosterApplicationEntity | null> {
    return this.repo.findOne({
      where: withTenant<BoosterApplicationEntity>(this.tenant, {
        id,
      }) as FindOptionsWhere<BoosterApplicationEntity>,
    });
  }

  paginate(
    skip: number,
    take: number,
    status?: BoosterStatus,
  ): Promise<[BoosterApplicationEntity[], number]> {
    const base = status ? { status } : {};
    return this.repo.findAndCount({
      where: withTenant<BoosterApplicationEntity>(this.tenant, base),
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  create(data: Partial<BoosterApplicationEntity>): BoosterApplicationEntity {
    return this.repo.create(data);
  }

  save(entity: BoosterApplicationEntity): Promise<BoosterApplicationEntity> {
    return this.repo.save(entity);
  }
}
