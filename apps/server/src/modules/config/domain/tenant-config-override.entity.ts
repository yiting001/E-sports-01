import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';

/** 租户对平台注册配置的值覆盖；配置元数据仍由 sys_config 统一维护。 */
@Entity('sys_tenant_config_override')
@Index(['tenantId', 'key'], { unique: true })
export class TenantConfigOverride extends BaseEntity {
  @Index()
  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ length: 128 })
  key!: string;

  @Column({ type: 'text' })
  value!: string;
}
