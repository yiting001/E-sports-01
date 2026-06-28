import { Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm';
import { TenantScopedEntity } from '../../../shared/domain/tenant-scoped.entity';
import { Role } from './role.entity';

/** 用户状态 */
export enum UserStatus {
  Enabled = 'enabled',
  Disabled = 'disabled',
}

/** 用户实体（聚合根）。用户名在租户内唯一 */
@Entity('rbac_user')
@Index(['tenantId', 'username'], { unique: true })
export class User extends TenantScopedEntity {
  @Column({ length: 64 })
  username!: string;

  /** bcrypt 哈希，绝不存明文；查询时默认不选出 */
  @Column({ name: 'password_hash', length: 100, select: false })
  passwordHash!: string;

  @Column({ length: 64, default: '' })
  nickname!: string;

  /** 头像可访问 URL；空串表示未设置，前端回退为默认头像 */
  @Column({ length: 512, default: '' })
  avatar!: string;

  /** 绑定手机号，用于短信验证码登录；空串表示未绑定。非空手机号的唯一性在应用层校验 */
  @Column({ length: 20, default: '' })
  phone!: string;

  @Column({ type: 'varchar', length: 16, default: UserStatus.Enabled })
  status!: UserStatus;

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'rbac_user_role',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles!: Role[];
}
