import { Column, DeleteDateColumn, Entity, Index, JoinTable, ManyToMany } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { Permission } from './permission.entity';
import { User } from './user.entity';

/** 租户内角色编码查询索引名（migration 与 synchronize 共用） */
export const ROLE_CODE_INDEX = 'IDX_rbac_role_tenant_code';

/**
 * 角色实体，连接用户与权限的中间概念。
 * 角色码只表达内置语义与分类，同租户可存在多个同编码角色，各自独立授权。
 */
@Entity('rbac_role')
@Index(ROLE_CODE_INDEX, ['tenantId', 'code'])
export class Role extends TenantScopedEntity {
  @Column({ length: 64 })
  code!: string;

  @Column({ length: 64 })
  name!: string;

  @Column({ length: 255, default: '' })
  remark!: string;

  /** 软删除时间：非空时默认查询与关联加载均自动排除，用户绑定与权限关联行保留 */
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: 'rbac_role_permission',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions!: Permission[];

  @ManyToMany(() => User, (user) => user.roles)
  users!: User[];
}
