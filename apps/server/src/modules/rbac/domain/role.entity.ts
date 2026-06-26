import { Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';
import { Permission } from './permission.entity';
import { User } from './user.entity';

/** 角色实体，连接用户与权限的中间概念 */
@Entity('rbac_role')
export class Role extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 64 })
  code!: string;

  @Column({ length: 64 })
  name!: string;

  @Column({ length: 255, default: '' })
  remark!: string;

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
