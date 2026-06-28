import { DEFAULT_TENANT_ID } from '@app/contracts';
import { Column, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

/**
 * 租户域实体基类。
 * 在审计字段之上统一加 tenantId 列，实现行级多租户隔离：
 * 列默认值为内置默认租户主键——历史行随建列自动归入默认租户、
 * 无请求上下文（启动/播种）写入的数据也落到默认租户，零数据迁移。
 * 写入回填由 TenantSubscriber 完成，查询过滤由各仓储经 TenantContextService 施加。
 */
export abstract class TenantScopedEntity extends BaseEntity {
  @Index()
  @Column({ name: 'tenant_id', length: 36, default: DEFAULT_TENANT_ID })
  tenantId!: string;
}
