import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantConfigOverride } from '../domain/tenant-config-override.entity';
import { TenantConfigOverrideRepository } from '../domain/tenant-config-override-repository.interface';

/** 租户配置覆盖的 TypeORM 适配器。 */
@Injectable()
export class TypeormTenantConfigOverrideRepository implements TenantConfigOverrideRepository {
  constructor(
    @InjectRepository(TenantConfigOverride)
    private readonly repository: Repository<TenantConfigOverride>,
  ) {}

  findByTenantAndKey(tenantId: string, key: string): Promise<TenantConfigOverride | null> {
    return this.repository.findOne({ where: { tenantId, key } });
  }

  async upsert(tenantId: string, key: string, value: string): Promise<void> {
    await this.repository.upsert({ tenantId, key, value }, { conflictPaths: ['tenantId', 'key'] });
  }

  async remove(tenantId: string, key: string): Promise<void> {
    await this.repository.delete({ tenantId, key });
  }
}
