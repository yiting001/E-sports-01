import { TenantStatus } from '@app/contracts';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';

/**
 * 租户实体（平台级，不参与行级隔离）。
 * 一行即一个隔离边界；租户域数据通过 tenantId 指向此表实现数据隔离。
 */
@Entity('sys_tenant')
export class TenantEntity extends BaseEntity {
  /** 租户编码：登录与隔离标识，全局唯一、不可变 */
  @Index({ unique: true })
  @Column({ length: 64 })
  code!: string;

  @Column({ length: 64 })
  name!: string;

  @Column({ type: 'varchar', length: 16, default: TenantStatus.Enabled })
  status!: TenantStatus;

  @Column({ length: 255, default: '' })
  remark!: string;

  /** 内置租户（默认租户）：不可删除/禁用 */
  @Column({ default: false })
  builtin!: boolean;
}
