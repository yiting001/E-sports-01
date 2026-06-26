import { Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/domain/base.entity';
import { Role } from './role.entity';

/** 用户状态 */
export enum UserStatus {
  Enabled = 'enabled',
  Disabled = 'disabled',
}

/** 用户实体（聚合根） */
@Entity('rbac_user')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 64 })
  username!: string;

  /** bcrypt 哈希，绝不存明文；查询时默认不选出 */
  @Column({ name: 'password_hash', length: 100, select: false })
  passwordHash!: string;

  @Column({ length: 64, default: '' })
  nickname!: string;

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
