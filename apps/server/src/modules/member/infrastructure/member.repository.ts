import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { MemberProfileEntity } from '../domain/member-profile.entity';
import { MemberRepository } from '../domain/member-repository.interface';

/** 会员档案仓储的 TypeORM 实现，读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormMemberRepository implements MemberRepository {
  constructor(
    @InjectRepository(MemberProfileEntity)
    private readonly repo: Repository<MemberProfileEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findByUserId(userId: string): Promise<MemberProfileEntity | null> {
    return this.repo.findOne({
      where: withTenant<MemberProfileEntity>(this.tenant, {
        userId,
      }) as FindOptionsWhere<MemberProfileEntity>,
    });
  }

  create(data: Partial<MemberProfileEntity>): MemberProfileEntity {
    return this.repo.create(data);
  }

  save(entity: MemberProfileEntity): Promise<MemberProfileEntity> {
    return this.repo.save(entity);
  }
}
