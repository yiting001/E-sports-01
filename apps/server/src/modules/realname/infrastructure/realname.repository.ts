import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { RealnameStatus } from '@app/contracts';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { RealnameAuthEntity } from '../domain/realname-auth.entity';
import { RealnameRepository } from '../domain/realname-repository.interface';

/** 实名认证仓储的 TypeORM 实现，读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormRealnameRepository implements RealnameRepository {
  constructor(
    @InjectRepository(RealnameAuthEntity)
    private readonly repo: Repository<RealnameAuthEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findByUserId(userId: string): Promise<RealnameAuthEntity | null> {
    return this.repo.findOne({
      where: withTenant<RealnameAuthEntity>(this.tenant, {
        userId,
      }) as FindOptionsWhere<RealnameAuthEntity>,
    });
  }

  findById(id: string): Promise<RealnameAuthEntity | null> {
    return this.repo.findOne({
      where: withTenant<RealnameAuthEntity>(this.tenant, {
        id,
      }) as FindOptionsWhere<RealnameAuthEntity>,
    });
  }

  paginate(
    skip: number,
    take: number,
    status?: RealnameStatus,
  ): Promise<[RealnameAuthEntity[], number]> {
    const base = status ? { status } : {};
    return this.repo.findAndCount({
      where: withTenant<RealnameAuthEntity>(this.tenant, base),
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }

  create(data: Partial<RealnameAuthEntity>): RealnameAuthEntity {
    return this.repo.create(data);
  }

  save(entity: RealnameAuthEntity): Promise<RealnameAuthEntity> {
    return this.repo.save(entity);
  }
}
