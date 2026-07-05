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

  /** 已建档走原子 increment；未建档先插入（唯一约束撞车则回退为 increment） */
  async increaseSpend(userId: string, amountFen: number): Promise<void> {
    const existing = await this.findByUserId(userId);
    if (existing) {
      await this.repo.increment({ id: existing.id }, 'spendFen', amountFen);
      return;
    }
    try {
      await this.repo.save(this.repo.create({ userId, spendFen: amountFen }));
    } catch {
      const concurrent = await this.findByUserId(userId);
      if (concurrent) {
        await this.repo.increment({ id: concurrent.id }, 'spendFen', amountFen);
      }
    }
  }

  create(data: Partial<MemberProfileEntity>): MemberProfileEntity {
    return this.repo.create(data);
  }

  save(entity: MemberProfileEntity): Promise<MemberProfileEntity> {
    return this.repo.save(entity);
  }
}
