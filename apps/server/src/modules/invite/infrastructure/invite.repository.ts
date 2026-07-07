import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { InviteCodeEntity } from '../domain/invite-code.entity';
import { InviteRecordEntity } from '../domain/invite-record.entity';
import { InviteRepository } from '../domain/invite-repository.interface';

/** 邀请仓储的 TypeORM 实现，读操作按租户上下文自动过滤 */
@Injectable()
export class TypeormInviteRepository implements InviteRepository {
  constructor(
    @InjectRepository(InviteCodeEntity)
    private readonly codes: Repository<InviteCodeEntity>,
    @InjectRepository(InviteRecordEntity)
    private readonly records: Repository<InviteRecordEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findCodeByUser(userId: string): Promise<InviteCodeEntity | null> {
    return this.codes.findOne({
      where: withTenant<InviteCodeEntity>(this.tenant, { userId }),
    });
  }

  findCodeByCode(code: string): Promise<InviteCodeEntity | null> {
    return this.codes.findOne({
      where: withTenant<InviteCodeEntity>(this.tenant, { code }),
    });
  }

  saveCode(data: Partial<InviteCodeEntity>): Promise<InviteCodeEntity> {
    return this.codes.save(this.codes.create(data));
  }

  findRecordByInvitee(inviteeId: string): Promise<InviteRecordEntity | null> {
    return this.records.findOne({
      where: withTenant<InviteRecordEntity>(this.tenant, { inviteeId }),
    });
  }

  saveRecord(data: Partial<InviteRecordEntity>): Promise<InviteRecordEntity> {
    return this.records.save(this.records.create(data));
  }

  listByInviter(inviterId: string): Promise<InviteRecordEntity[]> {
    return this.records.find({
      where: withTenant<InviteRecordEntity>(this.tenant, { inviterId }),
      order: { createdAt: 'DESC' },
    });
  }

  paginateRecords(
    skip: number,
    take: number,
  ): Promise<[InviteRecordEntity[], number]> {
    return this.records.findAndCount({
      where: withTenant<InviteRecordEntity>(this.tenant, {}),
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
  }
}
