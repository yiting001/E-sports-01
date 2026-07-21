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
    keyword?: string,
  ): Promise<[BoosterApplicationEntity[], number]> {
    const query = this.repo
      .createQueryBuilder('booster')
      .orderBy('booster.createdAt', 'DESC')
      .skip(skip)
      .take(take);

    const tenantId = this.tenant.scopeId();
    if (tenantId) {
      query.andWhere('"booster"."tenant_id" = :tenantId', { tenantId });
    }
    if (status) {
      query.andWhere('"booster"."status" = :status', { status });
    }

    const normalizedKeyword = keyword?.trim();
    if (normalizedKeyword) {
      query.leftJoin(
        'rbac_user',
        'registered_user',
        'CAST("registered_user"."id" AS text) = "booster"."userId" AND "registered_user"."tenant_id" = "booster"."tenant_id"',
      );
      query.andWhere(
        `(
          "booster"."applicant_name" ILIKE :keyword
          OR "registered_user"."nickname" ILIKE :keyword
          OR "registered_user"."username" ILIKE :keyword
          OR "registered_user"."phone" ILIKE :keyword
        )`,
        { keyword: `%${this.escapeLike(normalizedKeyword)}%` },
      );
    }

    return query.getManyAndCount();
  }

  private escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (character) => `\\${character}`);
  }

  create(data: Partial<BoosterApplicationEntity>): BoosterApplicationEntity {
    return this.repo.create(data);
  }

  async save(entity: BoosterApplicationEntity): Promise<BoosterApplicationEntity> {
    if (!entity.id) {
      return this.repo.save(entity);
    }

    const where = { id: entity.id, tenantId: entity.tenantId };
    await this.repo.update(where, {
      userId: entity.userId,
      legacyGameNickname: entity.legacyGameNickname,
      legacyGameName: entity.legacyGameName,
      legacyRank: entity.legacyRank,
      applicantName: entity.applicantName,
      gender: entity.gender,
      serviceRegions: entity.serviceRegions,
      intro: entity.intro,
      contactType: entity.contactType,
      contactValue: entity.contactValue,
      materialImage: entity.materialImage,
      voiceUrl: entity.voiceUrl,
      invitationCode: entity.invitationCode,
      status: entity.status,
      rejectReason: entity.rejectReason,
      reviewedBy: entity.reviewedBy,
      reviewedAt: entity.reviewedAt,
      acceptingOrders: entity.acceptingOrders,
    });
    return this.repo.findOneOrFail({ where });
  }

  recordCompletedOrder(userId: string): Promise<number | null> {
    return this.repo.manager.transaction(async (manager) => {
      const repository = manager.getRepository(BoosterApplicationEntity);
      const record = await repository.findOne({
        where: withTenant<BoosterApplicationEntity>(this.tenant, {
          userId,
        }) as FindOptionsWhere<BoosterApplicationEntity>,
        lock: { mode: 'pessimistic_write' },
      });
      if (!record) {
        return null;
      }
      const previousCompletedOrders = record.completedOrders;
      await repository.update(
        { id: record.id, tenantId: record.tenantId },
        { completedOrders: previousCompletedOrders + 1 },
      );
      return previousCompletedOrders;
    });
  }
}
