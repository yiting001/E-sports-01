import { BOOSTER_ROLE_CODE, BoosterStatus, UserStatusEnum } from '@app/contracts';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { SelectQueryBuilder } from 'typeorm';
import { Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { BoosterApplicationEntity } from '../domain/booster-application.entity';
import type {
  BoosterDirectoryFilter,
  BoosterDirectoryQuery,
  BoosterDirectoryRecord,
  BoosterCandidateRecord,
} from '../domain/booster-directory.query';

interface BoosterDirectoryRawRow {
  userId: string;
  nickname: string;
  avatar: string;
  gender: BoosterDirectoryRecord['gender'];
  serviceRegions: BoosterDirectoryRecord['serviceRegions'];
  intro: string;
  completedOrders: number | string;
  voiceUrl: string;
  acceptingOrders: boolean;
}

interface BoosterCandidateRawRow {
  id: string;
  username: string;
  nickname: string;
}

/** 跨 Booster/RBAC 的只读投影查询，不返回或修改其他模块实体。 */
@Injectable()
export class TypeormBoosterDirectoryQuery implements BoosterDirectoryQuery {
  constructor(
    @InjectRepository(BoosterApplicationEntity)
    private readonly repo: Repository<BoosterApplicationEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  async paginate(
    skip: number,
    take: number,
    filter: BoosterDirectoryFilter,
  ): Promise<[BoosterDirectoryRecord[], number]> {
    const query = this.createBaseQuery();
    if (!query) {
      return [[], 0];
    }
    this.applyFilter(query, filter);
    const total = await query.clone().getCount();
    const rows = await this.selectPublicFields(query)
      .orderBy('booster.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getRawMany<BoosterDirectoryRawRow>();
    return [rows.map((row) => this.toRecord(row)), total];
  }

  async findByUserId(userId: string, tenantId?: string): Promise<BoosterDirectoryRecord | null> {
    const query = this.createBaseQuery(tenantId);
    if (!query) {
      return null;
    }
    const row = await this.selectPublicFields(query)
      .andWhere('"booster"."userId" = :userId', { userId })
      .getRawOne<BoosterDirectoryRawRow>();
    return row ? this.toRecord(row) : null;
  }

  async paginateAvailableCandidates(
    skip: number,
    take: number,
    keyword?: string,
  ): Promise<[BoosterCandidateRecord[], number]> {
    const query = this.createBaseQuery();
    if (!query) {
      return [[], 0];
    }
    query.andWhere('"booster"."accepting_orders" = :acceptingOrders', {
      acceptingOrders: true,
    });
    const normalizedKeyword = keyword?.trim();
    if (normalizedKeyword) {
      const pattern = `%${this.escapeLike(normalizedKeyword)}%`;
      query.andWhere(
        '("directory_user"."username" ILIKE :candidateKeyword OR "directory_user"."nickname" ILIKE :candidateKeyword)',
        { candidateKeyword: pattern },
      );
    }
    const total = await query.clone().getCount();
    const rows = await query
      .select([
        '"directory_user"."id" AS "id"',
        '"directory_user"."username" AS "username"',
        '"directory_user"."nickname" AS "nickname"',
      ])
      .orderBy('booster.createdAt', 'DESC')
      .skip(skip)
      .take(take)
      .getRawMany<BoosterCandidateRawRow>();
    return [rows, total];
  }

  /** Portal 查询始终按令牌携带的租户过滤，包括平台超管账号。 */
  private createBaseQuery(
    tenantIdOverride?: string,
  ): SelectQueryBuilder<BoosterApplicationEntity> | null {
    const tenantId = tenantIdOverride ?? this.tenant.tenantId;
    if (!tenantId) {
      return null;
    }
    return this.repo
      .createQueryBuilder('booster')
      .innerJoin(
        'rbac_user',
        'directory_user',
        'CAST("directory_user"."id" AS text) = "booster"."userId" AND "directory_user"."tenant_id" = "booster"."tenant_id"',
      )
      .innerJoin(
        'rbac_user_role',
        'directory_user_role',
        '"directory_user_role"."user_id" = "directory_user"."id"',
      )
      .innerJoin(
        'rbac_role',
        'directory_role',
        '"directory_role"."id" = "directory_user_role"."role_id" AND "directory_role"."tenant_id" = "booster"."tenant_id"',
      )
      .where('"booster"."tenant_id" = :tenantId', { tenantId })
      .andWhere('"booster"."status" = :approved', {
        approved: BoosterStatus.Approved,
      })
      .andWhere('"directory_user"."status" = :enabled', {
        enabled: UserStatusEnum.Enabled,
      })
      .andWhere('"directory_role"."code" = :roleCode', {
        roleCode: BOOSTER_ROLE_CODE,
      });
  }

  private applyFilter(
    query: SelectQueryBuilder<BoosterApplicationEntity>,
    filter: BoosterDirectoryFilter,
  ): void {
    const keyword = filter.keyword?.trim();
    if (keyword) {
      const idKeyword = keyword.replace(/^打手/i, '').replace(/-/g, '');
      query.andWhere(
        '(REPLACE(CAST("directory_user"."id" AS text), \'-\', \'\') ILIKE :idPattern OR "directory_user"."nickname" ILIKE :keywordPattern)',
        {
          idPattern: `%${this.escapeLike(idKeyword)}%`,
          keywordPattern: `%${this.escapeLike(keyword)}%`,
        },
      );
    }
    if (filter.gender) {
      query.andWhere('"booster"."gender" = :gender', { gender: filter.gender });
    }
    if (filter.serviceRegion) {
      query.andWhere('"booster"."service_regions" @> CAST(:serviceRegion AS jsonb)', {
        serviceRegion: JSON.stringify([filter.serviceRegion]),
      });
    }
  }

  private selectPublicFields(
    query: SelectQueryBuilder<BoosterApplicationEntity>,
  ): SelectQueryBuilder<BoosterApplicationEntity> {
    return query.select([
      '"booster"."userId" AS "userId"',
      '"directory_user"."nickname" AS "nickname"',
      '"directory_user"."avatar" AS "avatar"',
      '"booster"."gender" AS "gender"',
      '"booster"."service_regions" AS "serviceRegions"',
      '"booster"."intro" AS "intro"',
      '"booster"."completed_orders" AS "completedOrders"',
      '"booster"."voice_url" AS "voiceUrl"',
      '"booster"."accepting_orders" AS "acceptingOrders"',
    ]);
  }

  private toRecord(row: BoosterDirectoryRawRow): BoosterDirectoryRecord {
    return {
      ...row,
      completedOrders: Number(row.completedOrders),
      serviceRegions: Array.isArray(row.serviceRegions) ? row.serviceRegions : [],
    };
  }

  private escapeLike(value: string): string {
    return value.replace(/[\\%_]/g, (character) => `\\${character}`);
  }
}
