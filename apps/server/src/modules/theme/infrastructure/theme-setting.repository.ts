import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { TenantContextService } from '../../../shared/tenant/tenant-context.service';
import { withTenant } from '../../../shared/tenant/tenant-scope.util';
import { ThemeSettingEntity } from '../domain/theme-setting.entity';
import { ThemeSettingRepository } from '../domain/theme-setting-repository.interface';

/** 主题特效配置仓储的 TypeORM 实现，管理端读写按租户上下文自动过滤 */
@Injectable()
export class TypeormThemeSettingRepository implements ThemeSettingRepository {
  constructor(
    @InjectRepository(ThemeSettingEntity)
    private readonly repo: Repository<ThemeSettingEntity>,
    private readonly tenant: TenantContextService,
  ) {}

  findCurrent(): Promise<ThemeSettingEntity | null> {
    return this.repo.findOne({
      where: withTenant<ThemeSettingEntity>(
        this.tenant,
        {},
      ) as FindOptionsWhere<ThemeSettingEntity>,
    });
  }

  findByTenantId(tenantId: string): Promise<ThemeSettingEntity | null> {
    return this.repo.findOne({ where: { tenantId } });
  }

  create(data: Partial<ThemeSettingEntity>): ThemeSettingEntity {
    return this.repo.create(data);
  }

  save(entity: ThemeSettingEntity): Promise<ThemeSettingEntity> {
    return this.repo.save(entity);
  }
}
